#!/usr/bin/env python3
"""App Store Connect işleri (GitHub Actions'ta çalışır; anahtar secret'lardan gelir).

  durum   : mağaza kaydının durumunu yazar (sürüm, diller, kategori, yaş, fiyat, derleme)
  metin   : store/metin.json'daki 6 dilli metinleri yazar
  gorsel  : store/ekran/<dil>/*.png ekran görüntülerini yükler (6.9 inç iPhone)
  ayar    : kategori, yaş derecelendirmesi, fiyat (ücretsiz), gizlilik adresi, derleme, inceleme notu
  gonder  : incelemeye gönderir
"""
import hashlib, json, os, sys, time

import jwt, requests

APP = "6831235877"
API = "https://api.appstoreconnect.apple.com"
SURUM = "1.0.0"
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def token():
    return jwt.encode(
        {"iss": os.environ["ASC_ISSUER_ID"], "iat": int(time.time()), "exp": int(time.time()) + 1100, "aud": "appstoreconnect-v1"},
        os.environ["ASC_API_KEY"], algorithm="ES256", headers={"kid": "6QNDBXCP8X", "typ": "JWT"})


H = {}


def istek(yontem, yol, **kw):
    if not H:
        H["Authorization"] = f"Bearer {token()}"
    for deneme in range(4):
        try:
            r = requests.request(yontem, API + yol, headers={**H, "Content-Type": "application/json"}, timeout=60, **kw)
        except requests.RequestException as e:
            print("AĞ HATASI", e)
            time.sleep(5 * (deneme + 1))
            continue
        if r.status_code >= 500:
            print("APPLE", r.status_code, "yeniden deneniyor")
            time.sleep(5 * (deneme + 1))
            continue
        if r.status_code >= 400:
            print("HATA", yontem, yol, r.status_code, r.text[:1500])
        return r
    raise SystemExit("Apple sunucusu cevap vermiyor")


def al(yol, **params):
    r = istek("GET", yol, params=params)
    r.raise_for_status()
    return r.json()


def surum():
    d = al(f"/v1/apps/{APP}/appStoreVersions", **{"filter[platform]": "IOS", "limit": 10})["data"]
    for v in d:
        if v["attributes"]["versionString"] == SURUM:
            return v
    return d[0] if d else None


def app_info():
    d = al(f"/v1/apps/{APP}/appInfos")["data"]
    # Düzenlenebilir olan (yayınlanmamış) bilgi
    for i in d:
        if i["attributes"].get("appStoreState") not in ("READY_FOR_SALE",):
            return i
    return d[0]


def durum():
    a = al(f"/v1/apps/{APP}")["data"]["attributes"]
    print("UYGULAMA", a.get("name"), a.get("bundleId"), "ana dil:", a.get("primaryLocale"))
    for v in al(f"/v1/apps/{APP}/appStoreVersions", **{"filter[platform]": "IOS"})["data"]:
        va = v["attributes"]
        print("SURUM", va["versionString"], va.get("appStoreState"), "telif:", va.get("copyright"), "yayın:", va.get("releaseType"))
        for l in al(f"/v1/appStoreVersions/{v['id']}/appStoreVersionLocalizations")["data"]:
            la = l["attributes"]
            print("  DIL", la["locale"], "açıklama:", len(la.get("description") or ""), "anahtar:", len(la.get("keywords") or ""),
                  "destek:", la.get("supportUrl"), "pazarlama:", la.get("marketingUrl"))
            for s in al(f"/v1/appStoreVersionLocalizations/{l['id']}/appScreenshotSets")["data"]:
                n = len(al(f"/v1/appScreenshotSets/{s['id']}/appScreenshots")["data"])
                print("    GORSEL", s["attributes"]["screenshotDisplayType"], n)
        b = istek("GET", f"/v1/appStoreVersions/{v['id']}/build").json().get("data")
        print("  DERLEME", b and b["attributes"]["version"])
        rd = istek("GET", f"/v1/appStoreVersions/{v['id']}/appStoreReviewDetail").json().get("data")
        print("  INCELEME BILGISI", rd and {k: rd["attributes"].get(k) for k in ("contactFirstName", "contactLastName", "contactEmail", "demoAccountRequired")})
    for i in al(f"/v1/apps/{APP}/appInfos")["data"]:
        ia = i["attributes"]
        print("BILGI", ia.get("appStoreState"), "yaş:", ia.get("appStoreAgeRating"))
        for rel in ("primaryCategory", "secondaryCategory"):
            c = istek("GET", f"/v1/appInfos/{i['id']}/{rel}").json().get("data")
            print("  ", rel, c and c["id"])
        for l in al(f"/v1/appInfos/{i['id']}/appInfoLocalizations")["data"]:
            la = l["attributes"]
            print("  BILGI DIL", la["locale"], "ad:", la.get("name"), "altbaşlık:", la.get("subtitle"), "gizlilik:", la.get("privacyPolicyUrl"))
    p = istek("GET", f"/v1/apps/{APP}/appPriceSchedule").json()
    print("FIYAT", "var" if p.get("data") else "yok")
    av = istek("GET", f"/v2/appAvailabilities/{APP}").json()
    print("ERISILEBILIRLIK", "var" if av.get("data") else av.get("errors", [{}])[0].get("code"))
    rs = al("/v1/reviewSubmissions", **{"filter[app]": APP, "limit": 5})["data"]
    for s in rs:
        print("GONDERIM", s["id"], s["attributes"].get("state"), s["attributes"].get("submittedDate"))


def metin():
    m = json.load(open(os.path.join(KOK, "store", "metin.json")))
    v = surum()
    vid = v["id"]
    r = istek("PATCH", f"/v1/appStoreVersions/{vid}", json={"data": {"type": "appStoreVersions", "id": vid, "attributes": {"copyright": m["telif"], "versionString": SURUM}}})
    print("SURUM", SURUM, r.status_code)
    var = {l["attributes"]["locale"]: l for l in al(f"/v1/appStoreVersions/{vid}/appStoreVersionLocalizations")["data"]}
    info = app_info()
    bvar = {l["attributes"]["locale"]: l for l in al(f"/v1/appInfos/{info['id']}/appInfoLocalizations")["data"]}
    for dil, t in m["diller"].items():
        attrs = {k: t[k] for k in ("description", "keywords", "promotionalText", "supportUrl", "marketingUrl") if t.get(k)}
        if dil not in var:
            r = istek("POST", "/v1/appStoreVersionLocalizations", json={"data": {"type": "appStoreVersionLocalizations",
                      "attributes": {"locale": dil, **attrs}, "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": vid}}}}})
        else:
            r = istek("PATCH", f"/v1/appStoreVersionLocalizations/{var[dil]['id']}", json={"data": {"type": "appStoreVersionLocalizations", "id": var[dil]["id"], "attributes": attrs}})
        print("SURUM METNI", dil, r.status_code)
        battrs = {k: t[k] for k in ("name", "subtitle", "privacyPolicyUrl") if t.get(k)}
        if dil not in bvar:
            ad = next(iter(bvar.values()))["attributes"]["name"]
            r = istek("POST", "/v1/appInfoLocalizations", json={"data": {"type": "appInfoLocalizations",
                      "attributes": {"locale": dil, "name": ad, **battrs}, "relationships": {"appInfo": {"data": {"type": "appInfos", "id": info["id"]}}}}})
        else:
            r = istek("PATCH", f"/v1/appInfoLocalizations/{bvar[dil]['id']}", json={"data": {"type": "appInfoLocalizations", "id": bvar[dil]["id"], "attributes": battrs}})
        print("BILGI METNI", dil, r.status_code)


def gorsel():
    tur = "APP_IPHONE_67"  # 6.7/6.9 inç (1290x2796 / 1320x2868)
    kok = os.environ.get("EKRAN_KOK") or os.path.join(KOK, "store", "ekran")
    v = surum()
    yer = {l["attributes"]["locale"]: l for l in al(f"/v1/appStoreVersions/{v['id']}/appStoreVersionLocalizations")["data"]}
    for dil in sorted(os.listdir(kok)):
        if dil not in yer:
            print("DIL YOK", dil)
            continue
        lid = yer[dil]["id"]
        setler = {s["attributes"]["screenshotDisplayType"]: s for s in al(f"/v1/appStoreVersionLocalizations/{lid}/appScreenshotSets")["data"]}
        if tur in setler:
            sid = setler[tur]["id"]
            for s in al(f"/v1/appScreenshotSets/{sid}/appScreenshots")["data"]:
                istek("DELETE", f"/v1/appScreenshots/{s['id']}")
        else:
            sid = istek("POST", "/v1/appScreenshotSets", json={"data": {"type": "appScreenshotSets", "attributes": {"screenshotDisplayType": tur},
                        "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": lid}}}}}).json()["data"]["id"]
        for ad in sorted(f for f in os.listdir(os.path.join(kok, dil)) if f.endswith(".png")):
            yol = os.path.join(kok, dil, ad)
            veri = open(yol, "rb").read()
            r = istek("POST", "/v1/appScreenshots", json={"data": {"type": "appScreenshots", "attributes": {"fileName": ad, "fileSize": len(veri)},
                      "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": sid}}}}}).json()["data"]
            for op in r["attributes"]["uploadOperations"]:
                parca = veri[op["offset"]: op["offset"] + op["length"]]
                requests.request(op["method"], op["url"], data=parca, headers={h["name"]: h["value"] for h in op["requestHeaders"]}, timeout=120).raise_for_status()
            k = istek("PATCH", f"/v1/appScreenshots/{r['id']}", json={"data": {"type": "appScreenshots", "id": r["id"],
                      "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(veri).hexdigest()}}})
            print("GORSEL", dil, ad, k.status_code)


def ayar():
    m = json.load(open(os.path.join(KOK, "store", "metin.json")))
    info = app_info()
    iid = info["id"]
    r = istek("PATCH", f"/v1/appInfos/{iid}", json={"data": {"type": "appInfos", "id": iid, "relationships": {
        "primaryCategory": {"data": {"type": "appCategories", "id": m["kategori"]}},
        "secondaryCategory": {"data": {"type": "appCategories", "id": m["ikinciKategori"]}}}}})
    print("KATEGORI", r.status_code)
    # Yaş derecelendirmesi: hiçbir hassas içerik yok → 4+
    yd = istek("GET", f"/v1/appInfos/{iid}/ageRatingDeclaration").json().get("data")
    if yd:
        attrs = m["yas"]
        r = istek("PATCH", f"/v1/ageRatingDeclarations/{yd['id']}", json={"data": {"type": "ageRatingDeclarations", "id": yd["id"], "attributes": attrs}})
        print("YAS", r.status_code)
    # Fiyat: ücretsiz (0 fiyat noktası, temel ülke TR)
    pp = al(f"/v1/apps/{APP}/appPricePoints", **{"filter[territory]": "TUR", "limit": 1})["data"]
    if pp:
        r = istek("POST", "/v1/appPriceSchedules", json={
            "data": {"type": "appPriceSchedules", "relationships": {
                "app": {"data": {"type": "apps", "id": APP}},
                "baseTerritory": {"data": {"type": "territories", "id": "TUR"}},
                "manualPrices": {"data": [{"type": "appPrices", "id": "${fiyat}"}]}}},
            "included": [{"type": "appPrices", "id": "${fiyat}", "attributes": {"startDate": None},
                          "relationships": {"appPricePoint": {"data": {"type": "appPricePoints", "id": pp[0]["id"]}}}}]})
        print("FIYAT", r.status_code)
    # Erişilebilirlik: tüm ülkeler (yoksa oluştur)
    av = istek("GET", f"/v2/appAvailabilities/{APP}")
    if av.status_code == 404 or not av.json().get("data"):
        ter = []
        url = f"/v1/territories?limit=200"
        while url:
            j = al(url.replace(API, "")) if url.startswith(API) else al(url)
            ter += [t["id"] for t in j["data"]]
            url = j.get("links", {}).get("next")
        inc = [{"type": "territoryAvailabilities", "id": f"${{t{i}}}", "attributes": {"available": True},
                "relationships": {"territory": {"data": {"type": "territories", "id": t}}}} for i, t in enumerate(ter)]
        r = istek("POST", "/v2/appAvailabilities", json={"data": {"type": "appAvailabilities", "attributes": {"availableInNewTerritories": True},
                  "relationships": {"app": {"data": {"type": "apps", "id": APP}},
                                    "territoryAvailabilities": {"data": [{"type": "territoryAvailabilities", "id": x["id"]} for x in inc]}}},
                  "included": inc})
        print("ERISILEBILIRLIK", r.status_code, len(ter))
    # Derleme ve sürüm ayarları
    v = surum()
    vid = v["id"]
    r = istek("PATCH", f"/v1/appStoreVersions/{vid}", json={"data": {"type": "appStoreVersions", "id": vid, "attributes": {"releaseType": "AFTER_APPROVAL"}}})
    print("YAYIN TURU", r.status_code)
    # İnceleme bilgisi
    ib = m["inceleme"]
    attrs = {"contactFirstName": ib["ad"], "contactLastName": ib["soyad"], "contactEmail": os.environ.get("ILETISIM_EPOSTA") or ib.get("eposta"),
             "contactPhone": os.environ.get("ILETISIM_TEL") or ib.get("tel"), "demoAccountRequired": False, "notes": ib["not"]}
    attrs = {k: v for k, v in attrs.items() if v not in (None, "")}
    rd = istek("GET", f"/v1/appStoreVersions/{vid}/appStoreReviewDetail").json().get("data")
    if rd:
        r = istek("PATCH", f"/v1/appStoreReviewDetails/{rd['id']}", json={"data": {"type": "appStoreReviewDetails", "id": rd["id"], "attributes": attrs}})
    else:
        r = istek("POST", "/v1/appStoreReviewDetails", json={"data": {"type": "appStoreReviewDetails", "attributes": attrs,
                  "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": vid}}}}})
    print("INCELEME BILGISI", r.status_code)
    bl = al("/v1/builds", **{"filter[app]": APP, "filter[version]": m["derleme"], "limit": 1})["data"]
    if bl and bl[0]["attributes"].get("processingState") == "VALID":
        r = istek("PATCH", f"/v1/appStoreVersions/{vid}/relationships/build", json={"data": {"type": "builds", "id": bl[0]["id"]}})
        print("DERLEME", m["derleme"], r.status_code)
    else:
        print("DERLEME", m["derleme"], "henüz hazır değil")


def gonder():
    v = surum()
    rs = istek("POST", "/v1/reviewSubmissions", json={"data": {"type": "reviewSubmissions", "attributes": {"platform": "IOS"},
               "relationships": {"app": {"data": {"type": "apps", "id": APP}}}}})
    if rs.status_code >= 400:
        acik = al("/v1/reviewSubmissions", **{"filter[app]": APP, "filter[state]": "READY_FOR_REVIEW", "limit": 1})["data"]
        if not acik:
            raise SystemExit(1)
        sid = acik[0]["id"]
    else:
        sid = rs.json()["data"]["id"]
    r = istek("POST", "/v1/reviewSubmissionItems", json={"data": {"type": "reviewSubmissionItems", "relationships": {
        "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": sid}},
        "appStoreVersion": {"data": {"type": "appStoreVersions", "id": v["id"]}}}}})
    print("OGE", r.status_code)
    r = istek("PATCH", f"/v1/reviewSubmissions/{sid}", json={"data": {"type": "reviewSubmissions", "id": sid, "attributes": {"submitted": True}}})
    print("GONDERILDI", r.status_code, r.text[:600])


if __name__ == "__main__":
    {"durum": durum, "metin": metin, "gorsel": gorsel, "ayar": ayar, "gonder": gonder}[sys.argv[1]]()
