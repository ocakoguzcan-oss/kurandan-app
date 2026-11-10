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
flute=bank('Woodwinds/Flute/susvib/*_1.wav',r'susvib_([A-G]#?\d)_')
mar=bank('Percussion/Marimba/*.wav',r'Outrigger_([A-G]#?\d)_')
glock=bank('Percussion/Glock/*.wav',r'medium_([A-G]#?\d)')

# Kanun: Hicaz (Re) arpej, sonra karar
ev=[];t=0
for n,d in [('D4',.16),('Eb4',.16),('F#4',.16),('G4',.16),('A4',.32),('Bb4',.16),('A4',.32),('G4',.0)]:
    ev.append((t,note(harp,n,3.5),.8)); t+=d
ev.append((t+.15,note(harp,'D4',4),.7)); ev.append((t+.15,note(harp,'D3',4),.5))
finish(mix(ev,6.5),'kanun',6.5)

# Ney (flüt, ney yerine): uzun, nefesli Hicaz cümlesi
ev=[];t=0
for n,d in [('A4',1.3),('G4',.8),('F#4',.8),('G4',2.6)]:
    ev.append((t,note(flute,n,d+.35,fade=.35),.75)); t+=d
finish(mix(ev,7.0),'ney',7.0)

# Damla: marimba, yumuşak inen damlalar
ev=[];t=0
for n,d in [('E5',.22),('C5',.22),('A4',.30),('E5',.22),('G4',.0)]:
    ev.append((t,note(mar,n,1.6),.7)); t+=d
ev.append((t+.25,note(mar,'C4',2.0),.6))
finish(mix(ev,3.8),'damla',3.8)

# Seher: çan (glockenspiel), sakin yükselen
ev=[];t=0
for n,d in [('G5',.38),('C6',.38),('E6',.38),('G6',.0)]:
    ev.append((t,note(glock,n,2.2),.45)); t+=d
ev.append((t+.4,note(glock,'C6',2.6),.35))
finish(mix(ev,4.8),'seher',4.8)

# Nur: Nepal çanı + vibrafon tınısı
b=load(os.path.join(V,'Miscellania Raw/Misc 2/NepaleseBells/fx1_short_r03_main.wav'))
v=load(os.path.join(V,'Miscellania Raw/Misc 1/vibraring3.wav'))
finish(mix([(0,b,.8),(0.9,v,.6),(1.9,b,.55)],5.0),'nur',5.0)
print('ok')
