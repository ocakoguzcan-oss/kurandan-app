# Kurandan.ai widget cami çizimleri (özgün, parametrik SVG). Gündüz ve gece sürümleri.
import sys
W, H, G = 600, 380, 352  # genişlik, yükseklik, zemin çizgisi

PAL = {
 'gunduz': dict(wall='#F1E8D6', wallS='#DCCDAF', dome='#9FB0BA', domeS='#7F919D', domeH='#C5D1D8', min='#F4EEE1', minS='#D8CBB0',
                cap='#8E9FAA', win='#5E6F7C', door='#4E5D68', alem='#C59A3C', green='#2F7A55', greenS='#245F43', ground='#CDBE9C', glow=None, gold='#D9A93A', goldS='#B98A26', tile='#3D6FA8', tileS='#2E5786', kaba='#1E1E22', kabaS='#2C2C33', marble='#F5F1EA', marbleS='#E2DACB', tree='#4E7A4A'),
 'gece':   dict(wall='#26324C', wallS='#1D2740', dome='#46557A', domeS='#323F60', domeH='#5A6A90', min='#2C3856', minS='#222D47',
                cap='#46557A', win='#FFCF6E', door='#FFB84D', alem='#E8C46A', green='#1F5A40', greenS='#174632', ground='#1A2236', glow='#FFC85A', gold='#E8B94A', goldS='#C79A30', tile='#2A4A78', tileS='#203B61', kaba='#101014', kabaS='#1B1B22', marble='#37425E', marbleS='#2B3550', tree='#22352E'),
}

def esc(s): return s

class C:
    def __init__(s, p): s.p=p; s.out=[]
    def add(s, x): s.out.append(x)
    def rect(s, x,y,w,h,f,rx=0): s.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{f}"/>')
    def dome(s, cx, by, r, h, f=None, fs=None, alem=True):
        p=s.p; f=f or p['dome']; fs=fs or p['domeS']
        s.add(f'<path d="M{cx-r:.1f} {by:.1f} C{cx-r:.1f} {by-h*1.32:.1f} {cx+r:.1f} {by-h*1.32:.1f} {cx+r:.1f} {by:.1f} Z" fill="{f}"/>')
        # gölge (sağ yarı)
        s.add(f'<path d="M{cx:.1f} {by-h:.1f} C{cx+r*0.55:.1f} {by-h:.1f} {cx+r:.1f} {by-h*0.6:.1f} {cx+r:.1f} {by:.1f} L{cx:.1f} {by:.1f} Z" fill="{fs}" opacity="0.55"/>')
        # kurşun kaplama çizgileri
        for k in (-0.5, 0, 0.5):
            x=cx+k*r
            s.add(f'<path d="M{x:.1f} {by:.1f} Q{cx+k*r*0.55:.1f} {by-h*0.75:.1f} {cx:.1f} {by-h:.1f}" stroke="{fs}" stroke-width="1" fill="none" opacity="0.5"/>')
        if alem:
            s.alem(cx, by-h)
    def alem(s, x, y, size=1.0):
        p=s.p; a=p['alem']
        s.add(f'<line x1="{x:.1f}" y1="{y:.1f}" x2="{x:.1f}" y2="{y-14*size:.1f}" stroke="{a}" stroke-width="{1.6*size:.1f}"/>')
        s.add(f'<circle cx="{x:.1f}" cy="{y-5*size:.1f}" r="{2.2*size:.1f}" fill="{a}"/>')
        # hilal
        s.add(f'<path d="M{x-4*size:.1f} {y-17*size:.1f} A{4.5*size:.1f} {4.5*size:.1f} 0 1 0 {x+4*size:.1f} {y-17*size:.1f} A{3.4*size:.1f} {3.4*size:.1f} 0 1 1 {x-4*size:.1f} {y-17*size:.1f} Z" fill="{a}"/>')
    def drum(s, cx, by, r, h, n):
        p=s.p
        s.rect(cx-r, by-h, 2*r, h, 'url(#duvar)')
        s.rect(cx-r-3, by-h-3, 2*r+6, 4, p['wallS'])
        step=2*r/n
        for i in range(n):
            x=cx-r+step*(i+0.5)
            s.win(x, by-h*0.5, step*0.36, h*0.55)
    def win(s, x, cy, w, h, door=False):
        p=s.p; f=p['door'] if door else p['win']
        r=w/2
        s.add(f'<path d="M{x-r:.1f} {cy+h/2:.1f} L{x-r:.1f} {cy-h/2+r:.1f} A{r:.1f} {r:.1f} 0 0 1 {x+r:.1f} {cy-h/2+r:.1f} L{x+r:.1f} {cy+h/2:.1f} Z" fill="{f}"/>')
    def body(s, x, y, w, h, rows=1, n=6):
        p=s.p
        s.rect(x, y, w, h, 'url(#duvar)')
        s.rect(x, y, w, 3, p['wallS'])
        for r_ in range(rows):
            cy=y+h*(r_+0.5)/rows
            step=w/n
            for i in range(n):
                s.win(x+step*(i+0.5), cy, step*0.32, h/rows*0.5)
    def minaret(s, x, h, w=10, bal=2, cap=None):
        p=s.p; base=G
        top=base-h
        s.rect(x-w/2-2, base-26, w+4, 26, p['min'])
        s.rect(x-w/2, top, w, h, p['min'])
        s.rect(x, top, w/2, h, p['minS'])
        for i in range(bal):
            by=top+ (h*0.18) + i*(h*0.17)
            s.rect(x-w/2-3.5, by, w+7, 4, p['min'], 1)
            s.rect(x-w/2-2.5, by+4, w+5, 2.2, p['minS'])
        capH=cap or w*3.2
        s.add(f'<path d="M{x-w/2-0.5:.1f} {top:.1f} L{x:.1f} {top-capH:.1f} L{x+w/2+0.5:.1f} {top:.1f} Z" fill="{p["cap"]}"/>')
        s.alem(x, top-capH, 0.7)
    def svg(s, extra=''):
        p=s.p
        d=(f'<defs><linearGradient id="duvar" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="{p["wall"]}"/>'
           f'<stop offset="0.55" stop-color="{p["wall"]}"/><stop offset="1" stop-color="{p["wallS"]}"/></linearGradient></defs>')
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{d}{extra}{"".join(s.out)}</svg>'

def suleymaniye(c):
    p=c.p
    c.minaret(92, 200, 9, 2); c.minaret(508, 200, 9, 2)
    c.minaret(170, 262, 10, 3); c.minaret(430, 262, 10, 3)
    c.body(150, 262, 300, 90, 2, 10)
    for x in (190, 410): c.dome(x, 262, 30, 24)
    c.rect(206, 236, 188, 26, 'url(#duvar)')
    c.dome(236, 236, 50, 34, alem=False); c.dome(364, 236, 50, 34, alem=False)
    c.drum(300, 214, 88, 26, 12)
    c.dome(300, 188, 92, 82)
    c.win(300, 322, 22, 50, door=True)

def selimiye(c):
    p=c.p
    for x in (178, 422): c.minaret(x, 300, 9, 3, 30)
    c.body(170, 270, 260, 82, 2, 9)
    for x in (204, 396): c.dome(x, 270, 26, 22)
    c.add('<path d="M190 270 L216 226 L384 226 L410 270 Z" fill="url(#duvar)"/>')
    c.drum(300, 226, 104, 30, 14)
    c.dome(300, 196, 110, 94)
    c.win(300, 322, 22, 50, door=True)

def sultanahmet(c):
    p=c.p
    for x,h in ((70,190),(530,190),(142,236),(458,236),(196,236),(404,236)):
        c.minaret(x, h, 8, 3 if h>200 else 2)
    c.body(120, 268, 360, 84, 2, 12)
    for x in (150, 450): c.dome(x, 268, 24, 20)
    c.rect(200, 244, 200, 24, 'url(#duvar)')
    c.dome(238, 244, 46, 32, alem=False); c.dome(362, 244, 46, 32, alem=False)
    c.drum(300, 218, 80, 26, 12)
    c.dome(300, 194, 84, 76)
    c.win(300, 322, 22, 50, door=True)

def nebevi(c):
    p=c.p
    for x in (96, 504, 214, 386):
        c.minaret(x, 250 if x in (96,504) else 220, 11, 3, 22)
    c.body(70, 250, 460, 102, 2, 14)
    # revak kemerleri
    c.rect(70, 238, 460, 12, p['wallS'])
    for x in (150, 450, 220, 380):
        c.dome(x, 238, 18, 15, alem=False)
    # yeşil kubbe
    c.rect(262, 206, 76, 32, 'url(#duvar)')
    c.drum(300, 206, 30, 18, 5)
    c.dome(300, 188, 34, 46, f=p['green'], fs=p['greenS'])
    c.win(300, 322, 22, 50, door=True)


def kabe(c):
    p=c.p
    # Mescid-i Haram revakları ve minareleri (arkada)
    for x,h in ((60,230),(130,250),(470,250),(540,230)):
        c.minaret(x, h, 10, 3, 24)
    c.rect(20, 262, 560, 90, p['marbleS'])
    step=560/16
    for i in range(16):
        c.win(20+step*(i+0.5), 300, step*0.5, 44)
    c.rect(20, 256, 560, 8, p['marble'])
    # avlu
    c.add(f'<path d="M0 {G} L600 {G} L600 {H} L0 {H} Z" fill="{p["marble"]}"/>')
    # Kâbe
    x0,w,top=232,136,212
    c.rect(x0, top, w, G-top, p['kaba'])
    c.add(f'<path d="M{x0+w*0.62} {top} L{x0+w} {top} L{x0+w} {G} L{x0+w*0.62} {G} Z" fill="{p["kabaS"]}"/>')
    c.rect(x0, top+28, w, 13, p['gold'])
    for i in range(7):
        c.rect(x0+6+i*18.5, top+31, 10, 2, p['goldS'])
    # kapı
    c.rect(x0+w*0.62, top+70, 24, 52, p['gold'], 2)
    c.rect(x0+w*0.62+4, top+76, 16, 40, p['goldS'], 1)
    c.rect(x0-6, G-6, w+12, 6, p['marbleS'])

def sahra(c):
    p=c.p
    # selviler
    for x in (70, 110, 500, 535):
        c.add(f'<path d="M{x} {G} C{x-16} {G-60} {x-8} {G-110} {x} {G-130} C{x+8} {G-110} {x+16} {G-60} {x} {G} Z" fill="{p["tree"]}"/>')
    # platform ve kemerler (kanatır)
    c.rect(130, 318, 340, 34, p['marbleS'])
    for i in range(5):
        c.win(170+i*65, 335, 30, 30)
    # sekizgen gövde (çini)
    c.add(f'<path d="M180 318 L180 236 L215 222 L385 222 L420 236 L420 318 Z" fill="{p["tile"]}"/>')
    c.add(f'<path d="M300 222 L385 222 L420 236 L420 318 L300 318 Z" fill="{p["tileS"]}" opacity="0.6"/>')
    c.rect(180, 236, 240, 8, p['marble'])
    for i in range(7):
        c.win(196+i*34, 280, 13, 30)
    # kasnak
    c.rect(238, 196, 124, 26, p['tile'])
    c.rect(238, 196, 124, 4, p['marble'])
    for i in range(6):
        c.win(252+i*19.5, 210, 7, 14)
    # altın kubbe
    c.dome(300, 196, 64, 70, f=p['gold'], fs=p['goldS'])

def kuba(c):
    p=c.p
    for x in (96, 504, 196, 404):
        c.minaret(x, 250 if x in (96,504) else 215, 13, 3, 26)
    c.body(80, 262, 440, 90, 2, 14)
    for x in (130, 180, 420, 470):
        c.dome(x, 262, 20, 18, f=p['marble'], fs=p['marbleS'], alem=False)
    c.rect(220, 230, 160, 32, 'url(#duvar)')
    for x in (250, 350):
        c.dome(x, 230, 28, 26, f=p['marble'], fs=p['marbleS'])
    c.drum(300, 220, 46, 22, 6)
    c.dome(300, 198, 50, 56, f=p['marble'], fs=p['marbleS'])
    c.win(300, 322, 22, 50, door=True)

MAP={'kabe':kabe,'nebevi':nebevi,'aksa':sahra,'kuba':kuba}
for ad,fn in MAP.items():
    for mod in ('gunduz','gece'):
        c=C(PAL[mod]); fn(c)
        extra=''
        if PAL[mod]['glow']:
            extra=('<defs><radialGradient id="g" cx="50%" cy="80%" r="55%"><stop offset="0" stop-color="#FFC85A" stop-opacity="0.28"/>'
                   '<stop offset="1" stop-color="#FFC85A" stop-opacity="0"/></radialGradient></defs><rect x="0" y="120" width="600" height="260" fill="url(#g)"/>')
        open(f'{ad}_{mod}.svg','w').write(c.svg(extra))
print('ok')
