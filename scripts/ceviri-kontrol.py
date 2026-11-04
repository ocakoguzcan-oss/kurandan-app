"""Çeviri anahtarlarını toplar ve eksikleri listeler.

Kaynak dil Türkçedir: kodda t('...') ve tx('...') içine yazılan Türkçe metinler anahtardır.
  python3 scripts/ceviri-kontrol.py            → eksik/fazla anahtarları yazar
  python3 scripts/ceviri-kontrol.py --anahtar  → tüm anahtarları scripts/ceviri-anahtarlari.json'a yazar
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
LANGS = ['en', 'de', 'ar', 'fr', 'ru']
STR = r"""(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")"""
CALL = re.compile(r"(?<![\w.])tx?\(\s*" + STR)
# t() ile çevrilen ama düz metin olarak yazılan alanlar
FIELDS = {
    'src/data/diniGunler.ts': re.compile(r"\b(?:name|note): " + STR),
    'src/lib/prayerTimes.ts': re.compile(r"^\s+(?:imsak|gunes|ogle|ikindi|aksam|yatsi): " + STR, re.M),
}

def unesc(s):
    return re.sub(r"\\(.)", lambda m: {'n': '\n', 't': '\t'}.get(m.group(1), m.group(1)), s)

def keys():
    out = {}
    for d in ('app', 'src'):
        for dp, _, fs in os.walk(os.path.join(ROOT, d)):
            for f in fs:
                if not f.endswith(('.ts', '.tsx')) or f.endswith('.d.ts'):
                    continue
                p = os.path.join(dp, f)
                rel = os.path.relpath(p, ROOT)
                s = open(p, encoding='utf-8').read()
                pats = [CALL] + ([FIELDS[rel]] if rel in FIELDS else [])
                for pat in pats:
                    for m in pat.finditer(s):
                        k = unesc(m.group(1) if m.group(1) is not None else m.group(2))
                        if k.strip():
                            out.setdefault(k, rel)
    # prayerTimes VAKIT_NAMES dışındaki aynı desenli satırları ele (yalnız Türkçe adlar)
    return out

if __name__ == '__main__':
    k = keys()
    if '--anahtar' in sys.argv:
        json.dump(sorted(k), open(os.path.join(ROOT, 'scripts', 'ceviri-anahtarlari.json'), 'w'), ensure_ascii=False, indent=1)
        print(len(k), 'anahtar yazıldı')
        sys.exit(0)
    bad = 0
    for l in LANGS:
        p = os.path.join(ROOT, 'src', 'i18n', f'{l}.json')
        d = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
        miss = [x for x in k if x not in d]
        extra = [x for x in d if x not in k]
        ph = [x for x in k if x in d and sorted(re.findall(r"\{\w+\}", x)) != sorted(re.findall(r"\{\w+\}", d[x]))]
        print(f'{l}: {len(d)} çeviri, {len(miss)} eksik, {len(extra)} fazla, {len(ph)} değişken uyuşmazlığı')
        for x in miss[:15]: print('   eksik:', x[:80], '←', k[x])
        for x in ph[:10]: print('   {…} uyuşmuyor:', x[:80])
        bad += len(miss) + len(ph)
    sys.exit(1 if bad else 0)
