# Kurandan zil sesleri: VSCO-2 CE (CC0) gerçek enstrüman örneklerinden
import sys,re,glob,os
import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, resample_poly
V=sys.argv[1]; OUT=sys.argv[2]; SR=44100
N={'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}
def midi(n):
    m=re.match(r'([A-G][#b]?)(-?\d)',n); return 12*(int(m.group(2))+1)+N[m.group(1)]
def load(p):
    sr,x=wavfile.read(p)
    if x.dtype.kind=='i': x=x.astype(np.float64)/np.iinfo(x.dtype).max
    x=x.astype(np.float64)
    if x.ndim==1: x=x[:,None]
    if x.shape[1]==1: x=np.repeat(x,2,1)
    return x[:,:2]
def bank(pattern,rx):
    b={}
    for p in glob.glob(os.path.join(V,pattern)):
        m=re.search(rx,os.path.basename(p))
        if m: b[midi(m.group(1))]=p
    return b
def shift(x,semi):
    if abs(semi)<1e-6: return x
    r=2**(semi/12); n=int(len(x)/r); t=np.arange(n)*r
    return np.stack([np.interp(t,np.arange(len(x)),x[:,c]) for c in range(2)],1)
def note(b,n,dur=None,fade=0.15,trim=True):
    m=midi(n); k=min(b,key=lambda q:abs(q-m)); x=load(b[k])
    if trim:  # baştaki sessizliği at
        a=np.abs(x).max(1); i=np.argmax(a>a.max()*0.02); x=x[max(0,i-50):]
    x=shift(x,m-k)
    if dur:
        L=int(dur*SR); x=x[:L].copy(); f=int(min(fade,dur/2)*SR)
        if f>0: x[-f:]*=np.linspace(1,0,f)[:,None]
    return x
def reverb(x,sec=2.2,wet=0.28,seed=1):
    rng=np.random.default_rng(seed); L=int(sec*SR); t=np.arange(L)/SR
    ir=np.stack([rng.standard_normal(L)*np.exp(-t*6.9/sec) for _ in range(2)],1)
    ir[:int(0.012*SR)]=0; ir/=np.sqrt((ir**2).sum(0))
    y=np.stack([fftconvolve(x[:,c],ir[:,c]) for c in range(2)],1)
    out=np.zeros_like(y); out[:len(x)]+=x*(1-wet); out+=y*wet
    return out
def mix(events,total):
    y=np.zeros((int(total*SR),2))
    for t,x,g in events:
        i=int(t*SR); L=min(len(x),len(y)-i)
        if L>0: y[i:i+L]+=x[:L]*g
    return y
def finish(y,name,total):
    y=reverb(y)[:int(total*SR)]
    f=int(0.8*SR); y[-f:]*=np.linspace(1,0,f)[:,None]**2
    y/=np.abs(y).max()/0.89
    wavfile.write(os.path.join(OUT,name+'.wav'),SR,(y*32767).astype(np.int16))


harp=bank('Strings/Harp/*.wav',r'KSHarp_([A-G]#?\d)_')
mar=bank('Percussion/Marimba/*.wav',r'Outrigger_([A-G]#?\d)_')
glock=bank('Percussion/Glock/*.wav',r'medium_([A-G]#?\d)')
pno=bank('Keys/Upright Nr1/*_mf_RR1.wav',r'UR1_([A-G]#?\d)_')
vpz=bank('Strings/Viola Section/pizz/*_v1_rr1.wav',r'pizz_([A-G]#?\d)_')
def seq(b,notes,g=.8,ring=3.0,start=0):
    ev=[];t=start
    for n,d in notes:
        if n: ev.append((t,note(b,n,ring),g))
        t+=d
    return ev,t
def save(y,name):
    f=int(.3*SR); y[-f:]*=np.linspace(1,0,f)[:,None]
    y/=np.abs(y).max()/0.89
    wavfile.write(os.path.join(OUT,name+'.wav'),SR,(y*32767).astype(np.int16))
def chime(n,dur=3.0):  # çan: piyano + bir oktav üst glock
    a=note(pno,n,dur); b=note(glock,n[:-1]+str(int(n[-1])+1),dur); m=min(len(a),len(b)); return a[:m]*.7+b[:m]*.4

# Ding Dong: iki notalı kapı zili, iki kez
ev=[(0,chime('A4'),1),(0.55,chime('F4'),1),(1.9,chime('A4'),.8),(2.45,chime('F4'),.8)]
finish(mix(ev,4.6),'m_dingdong',4.6)

# Bip: üç kısa saf ton
t=np.arange(int(.12*SR))/SR; env=np.minimum(1,np.minimum(t/.005,(t[-1]-t)/.02))
b=np.sin(2*np.pi*1760*t)*env*.6+np.sin(2*np.pi*3520*t)*env*.1; b=np.stack([b,b],1)
y=mix([(0,b,1),(.22,b,1),(.44,b,1),(1.1,b,1),(1.32,b,1),(1.54,b,1)],2.2)
save(y,'n_bip')

# Melodi 1: marimba, Nihavend havasında neşeli
ev,t=seq(mar,[('D5',.18),('F5',.18),('A5',.36),('G5',.18),('F5',.18),('E5',.18),('D5',.36),('A4',.18),('D5',0)],.75,1.6)
finish(mix(ev,t+2.0),'o_melodi1',t+2.0)

# Melodi 2: kanun + glock, Rast
ev,t=seq(harp,[('G4',.24),('B4',.24),('D5',.24),('G5',.48),('F#5',.24),('E5',.24),('D5',.48),('G4',0)],.7,3.0)
ev2,_=seq(glock,[('G5',.96),('D6',.96),(None,0)],.25,2.5)
finish(mix(ev+ev2,t+2.4),'p_melodi2',t+2.4)

# Melodi 3: piyano, Hüzzam'a yakın yavaş
ev,t=seq(pno,[('C4',.5),('Eb4',.5),('G4',.5),('Ab4',.8),('G4',.5),('F4',.5),('Eb4',1.0),('C4',0)],.65,3.5)
finish(mix(ev,t+2.6),'q_melodi3',t+2.6)

# Uyan: yükselen ve tekrarlayan, giderek güçlenen marimba + glock
ev=[];t=0
for r in range(4):
    g=.45+r*.17
    for n in ['C5','E5','G5','C6']:
        ev.append((t,note(mar,n,1.2),g)); ev.append((t,note(glock,n[:-1]+str(int(n[-1])+1),1.2),g*.35)); t+=.16
    t+=.32
finish(mix(ev,t+1.5),'r_uyan',t+1.5)

# Yüksek Ses: güçlü, net çan dizisi (uykudan uyandırmak için)
ev=[];t=0
for r in range(3):
    for n in ['E5','B5','E6']:
        ev.append((t,chime(n,1.6),1)); t+=.22
    t+=.5
y=mix(ev,t+1.0); y=reverb(y,1.0,.15)[:len(y)]
save(y,'s_yuksek')

# Kuş sesi (sentetik): cıvıltılar
rng=np.random.default_rng(7); ev=[]; t=0.1
def chirp(f0,f1,d):
    tt=np.arange(int(d*SR))/SR; f=f0+(f1-f0)*(tt/d)**.6
    ph=2*np.pi*np.cumsum(f)/SR; env=np.sin(np.pi*tt/d)**2
    x=(np.sin(ph)+.25*np.sin(2*ph))*env*.5; return np.stack([x,x*.9],1)
for k in range(3):
    for j in range(rng.integers(3,6)):
        f0=rng.uniform(3200,4200); ev.append((t,chirp(f0,f0+rng.uniform(800,1600),rng.uniform(.05,.09)),1)); t+=rng.uniform(.08,.12)
    ev.append((t,chirp(5200,2600,.18),.9)); t+=rng.uniform(.5,.8)
finish(mix(ev,t+1.0),'t_kus',t+1.0)
print('ok')
