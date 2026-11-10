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


G=os.path.join(V,'VSCO 1 Percussion/drums/other/ethnic/giant')
def L(p,trim=True):
    x=load(p)
    if trim:
        a=np.abs(x).max(1); i=np.argmax(a>a.max()*0.02); x=x[max(0,i-30):]
    return x
dum=L(G+'/mallet/EthnicLargeMallet_hit_ff_1.wav'); dum2=L(G+'/mallet/EthnicLargeMallet_hit_mf_1.wav')
tek=L(G+'/sticks/EthnicLargeSticks_hit_mf_1.wav'); tek2=L(G+'/sticks/EthnicLargeSticks_hit_mp_1.wav')
rim=L(G+'/EthnicLargeStick_rimshot_1.wav')
# Sahur davulu: düm . tek tek | düm tek . tek  (yaklaşık 116 vuruş/dk, sekizlik)
e=60/116/2; ev=[]
pat=['D',None,'t','t','D','t',None,'r']
for bar in range(3):
    for i,h in enumerate(pat):
        t=(bar*8+i)*e
        if h=='D': ev.append((t,dum if i==0 else dum2,1.0))
        elif h=='t': ev.append((t,tek if i%2 else tek2,.55))
        elif h=='r': ev.append((t,rim,.5))
ev.append((24*e,dum,1.0))
y=mix(ev,24*e+2.2)
y=reverb(y,1.2,.12)[:len(y)]
f=int(.5*SR); y[-f:]*=np.linspace(1,0,f)[:,None]
y/=np.abs(y).max()/0.89
wavfile.write(os.path.join(OUT,'i_davul.wav'),SR,(y*32767).astype(np.int16))

# Masa saati: Westminster çeyrek melodisi (kamu malı, 1793) çan tınısıyla + 3 vuruş
pno=bank('Keys/Upright Nr1/*_mf_RR1.wav',r'UR1_([A-G]#?\d)_')
glock=bank('Percussion/Glock/*.wav',r'medium_([A-G]#?\d)')
def bell(n,g=1.0,dur=3.5):
    a=note(pno,n,dur); b=note(glock,n[:-1]+str(int(n[-1])+1),dur)
    m=min(len(a),len(b)); return a[:m]*.7+b[:m]*.45
ev=[];t=0
for n in ['E4','G#4','F#4','B3', 'E4','F#4','G#4','E4']:
    ev.append((t,bell(n),.8)); t+=.55
t+=.6
for k in range(3):
    ev.append((t,bell('E3',dur=3.0),.9)); ev.append((t,note(pno,'E2',3.0),.5)); t+=1.1
finish(mix(ev,t+1.6),'j_masa_saati',t+1.6)
print('ok')
