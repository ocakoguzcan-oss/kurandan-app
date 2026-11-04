"""content/kabe-yolu.json'dan diğer diller için kabe-yolu.<dil>.json üretir.
Satır biçimi: no|en|de|ar|fr|ru (no: Türkçe metinlerin dosyadaki sırası). Çevirisi verilmeyen metin aynen kalır."""
import json, os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = json.load(open(os.path.join(ROOT, 'content', 'kabe-yolu.json'), encoding='utf-8'))
order = []
def walk(o, k=None):
    if isinstance(o, str):
        if k in ('url', 'id', 'tur', 'guncelleme') or not o.strip(): return
        if o not in order: order.append(o)
    elif isinstance(o, list):
        for x in o: walk(x, k)
    elif isinstance(o, dict):
        for kk, v in o.items(): walk(v, kk)
walk(src)
L = ['en', 'de', 'ar', 'fr', 'ru']
tr = {l: {} for l in L}
for f in sys.argv[1:]:
    for line in open(f, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line: continue
        p = line.split('|'); assert len(p) == 6, p[0]
        for l, v in zip(L, p[1:]): tr[l][order[int(p[0])]] = v
def conv(o, l, k=None):
    if isinstance(o, str):
        return o if k in ('url', 'id', 'tur', 'guncelleme') else tr[l].get(o, o)
    if isinstance(o, list): return [conv(x, l, k) for x in o]
    if isinstance(o, dict): return {kk: conv(v, l, kk) for kk, v in o.items()}
    return o
for l in L:
    json.dump(conv(src, l), open(os.path.join(ROOT, 'content', f'kabe-yolu.{l}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
left = [s for s in order if s not in tr['en']]
print(len(order), 'metin;', len(order) - len(left), 'çevrildi; aynen kalan:', left)
