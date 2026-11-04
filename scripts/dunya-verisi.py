"""Dünya şehir / ülke / saat dilimi verisini üretir.

Kaynaklar (scratchpad'e git ile indirilir):
  - city-timezones (MIT, Natural Earth tabanlı): şehir, il, koordinat, nüfus, saat dilimi
  - Unicode CLDR (Unicode License v3): ülke adlarının 6 dildeki karşılıkları
  - Python zoneinfo (IANA tz): 2025–2040 arası yaz/kış saati geçişleri
Kullanım: python3 scripts/dunya-verisi.py <city-timezones dizini> <cldr-json dizini>
"""
import json, sys, datetime, zoneinfo, os

CT, CLDR = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'world')
LANGS = ['tr', 'en', 'de', 'ar', 'fr', 'ru']

cities = json.load(open(os.path.join(CT, 'data', 'cityMap.json')))
names = {}
for l in LANGS:
    p = os.path.join(CLDR, 'cldr-json', 'cldr-localenames-full', 'main', l, 'territories.json')
    names[l] = json.load(open(p))['main'][l]['localeDisplayNames']['territories']

# Kosova CLDR'da XK
by_c = {}
for c in cities:
    iso = str(c.get('iso2') or '').upper()
    if not iso or iso == 'TR' or not c.get('timezone'):
        continue
    by_c.setdefault(iso, []).append(c)

ALIAS = {'America/Godthab': 'America/Nuuk', 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu',
         'Asia/Rangoon': 'Asia/Yangon', 'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Europe/Kiev': 'Europe/Kyiv',
         'Atlantic/Faeroe': 'Atlantic/Faroe', 'Pacific/Truk': 'Pacific/Chuuk', 'Pacific/Ponape': 'Pacific/Pohnpei',
         'Asia/Ulan_Bator': 'Asia/Ulaanbaatar', 'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
         'Europe/Uzhgorod': 'Europe/Kyiv', 'Europe/Zaporozhye': 'Europe/Kyiv'}
def zone(t):
    try:
        return zoneinfo.ZoneInfo(t)
    except Exception:
        return zoneinfo.ZoneInfo(ALIAS[t])
for c in cities:
    if c.get('timezone') in ALIAS:
        c['timezone'] = ALIAS[c['timezone']]
tzs = sorted({c['timezone'] for l in by_c.values() for c in l} | {'Europe/Istanbul'})
tzi = {t: i for i, t in enumerate(tzs)}

out_c = {}
for iso, lst in by_c.items():
    seen = set()
    rows = []
    for c in sorted(lst, key=lambda x: -(x.get('pop') or 0)):
        nm = str(c['city']).strip()
        key = (nm.lower(), str(c.get('province') or '').lower())
        if key in seen:
            continue
        seen.add(key)
        prov = str(c.get('province') or '').strip()
        if prov == nm:
            prov = ''
        rows.append([nm, prov, round(c['lat'], 4), round(c['lng'], 4), tzi[c['timezone']], int(c.get('pop') or 0)])
    out_c[iso] = rows

countries = []
for iso in sorted(set(out_c) | {'TR'}):
    n = {}
    for l in LANGS:
        n[l] = names[l].get(iso) or names['en'].get(iso) or iso
    countries.append({'c': iso, 'n': n})

# Saat dilimi geçişleri: [ilk ofset (dk), [geçiş anı (Unix dakika), yeni ofset], ...]
start = datetime.datetime(2025, 1, 1, tzinfo=datetime.timezone.utc)
end = datetime.datetime(2041, 1, 1, tzinfo=datetime.timezone.utc)
tzdata = {}
for t in tzs:
    z = zone(t)
    off = lambda dt: int(dt.astimezone(z).utcoffset().total_seconds() // 60)
    cur = off(start)
    rec = [cur]
    dt = start
    step = datetime.timedelta(hours=1)
    while dt < end:
        nxt = dt + datetime.timedelta(days=1)
        o = off(nxt)
        if o != cur:
            # saatlik hassaslaştır
            h = dt
            while off(h) == cur:
                h += step
            rec.append([int(h.timestamp() // 60), o])
            cur = o
        dt = nxt
    tzdata[t] = rec

json.dump({'tz': tzs, 'c': out_c}, open(os.path.join(OUT, 'cities.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(countries, open(os.path.join(OUT, 'countries.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(tzdata, open(os.path.join(OUT, 'tz.json'), 'w'), separators=(',', ':'))
print(len(countries), 'ülke', sum(len(v) for v in out_c.values()), 'şehir', len(tzs), 'saat dilimi')
