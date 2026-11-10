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
vpz=bank('Strings/Viola Section/pizz/*_v1_rr1.wav',r'pizz_([A-G]#?\d)_')
cpz=bank('Strings/Cello Section/pizzT/*_v1_RR1.wav',r'pizzT_([A-G]#?\d)_')
vln=bank('Strings/Solo Violin/Arco Vib/*_p.wav',r'ArcoVib_([A-G]#?\d)_')
cla=bank('Woodwinds/Clarinet/susLong/*_v2_rr1_sum.wav',r'susLong_([A-G]#?\d)_')
pno=bank('Keys/Upright Nr1/*_mf_RR1.wav',r'UR1_([A-G]#?\d)_')

def seq(b,notes,g=.8,ring=3.0,start=0):
    ev=[];t=start
    for n,d in notes:
        ev.append((t,note(b,n,ring),g)); t+=d
    return ev,t

# B: Kanun II - Uşşak, kanun gibi tekrarlanan mızrap
ev,t=seq(harp,[('A4',.11),('A4',.11),('A4',.22),('Bb4',.22),('C5',.22),('D5',.44),('C5',.22),('Bb4',.22),('A4',0)],.75)
ev.append((t+.3,note(harp,'A3',4),.55)); ev.append((t+.3,note(harp,'E4',4),.4))
finish(mix(ev,6.0),'b_kanun2',6.0)

# C: Ud - Rast, pizzicato (ud havası)
ev,t=seq(vpz,[('G3',.2),('A3',.2),('B3',.2),('C4',.2),('D4',.4),('C4',.2),('B3',.2),('A3',.2),('G3',0)],.85,2.0)
ev.append((t,note(cpz,'G2',3),.6))
finish(mix(ev,4.6),'c_ud',4.6)

# D: Keman - Hüzzam'a yakın kısa cümle
ev=[];t=0
for n,d in [('D5',.9),('Eb5',.7),('D5',.6),('C5',.6),('D5',2.2)]:
    ev.append((t,note(vln,n,d+.3,fade=.3),.7)); t+=d
finish(mix(ev,6.0),'d_keman',6.0)

# E: Klarnet - Hicaz
ev=[];t=0
for n,d in [('A4',.8),('Bb4',.5),('C#5',.5),('D5',.9),('C#5',.4),('Bb4',.4),('A4',1.8)]:
    ev.append((t,note(cla,n,d+.25,fade=.25),.7)); t+=d
finish(mix(ev,6.4),'e_klarnet',6.4)

# F: Piyano - yumuşak Uşşak
ev,t=seq(pno,[('D4',.35),('A4',.35),('C5',.35),('D5',.6),('Eb5',.35),('D5',0)],.65,3.5)
ev.append((t+.35,note(pno,'D3',4),.45))
finish(mix(ev,5.6),'f_piyano',5.6)

# G: Rüzgâr çanı (gerçek kayıt)
w=load(os.path.join(V,'VSCO 1 Percussion/varMetal/various/windchimes_slowDesc1.wav'))[:int(5.5*SR)]
finish(mix([(0,w,1.0)],5.5),'g_ruzgar',5.5)

# H: Kanun + Ud - Hicaz
ev,t=seq(harp,[('D4',.2),('Eb4',.2),('F#4',.2),('G4',.2),('A4',.4),('G4',.2),('F#4',.2),('Eb4',.2),('D4',0)],.7)
ev2,_=seq(vpz,[('D3',.8),('A3',.8),('D3',.8)],.6,2.0,.0)
finish(mix(ev+ev2+[(t+.2,note(cpz,'D2',3),.55)],5.8),'h_kanun_ud',5.8)
print('ok')
