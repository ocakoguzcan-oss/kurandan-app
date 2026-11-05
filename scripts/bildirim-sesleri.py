"""Telifsiz bildirim seslerini sıfırdan üretir (sentez; dış kayıt kullanılmaz).
Çıktı: assets/sounds/ses_*.wav (mono, 22.05 kHz, 16 bit, < 30 sn)
  nur   – marimba arpejı (pentatonik)
  seher – arp tınısı, yükselen akor
  ney   – nefesli ney ezgisi (Hicaz dizisi)
  kanun – kanun/ud tellerinde kısa Hicaz ezgisi
  damla – su damlası ezgisi
"""
import numpy as np, wave, os
SR = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'sounds')
rng = np.random.default_rng(7)

def note(n):  # A4=69 MIDI
    return 440.0 * 2 ** ((n - 69) / 12)

def env(t, a, d):
    e = np.minimum(t / a, 1.0) * np.exp(-t / d)
    return e

def marimba(f, dur=1.4):
    t = np.arange(int(SR * dur)) / SR
    s = np.sin(2*np.pi*f*t) + 0.25*np.sin(2*np.pi*4*f*t)*np.exp(-t/0.08) + 0.1*np.sin(2*np.pi*10*f*t)*np.exp(-t/0.02)
    return s * env(t, 0.003, 0.35)

def harp(f, dur=2.5):
    # Karplus–Strong
    n = int(SR * dur); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.996 * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    t = np.arange(n) / SR
    return out * np.minimum(t / 0.002, 1)

def ney(f, dur):
    t = np.arange(int(SR * dur)) / SR
    vib = 1 + 0.006 * np.sin(2*np.pi*5.2*t) * np.minimum(t/0.4, 1)
    ph = 2*np.pi*np.cumsum(f*vib)/SR
    tone = np.sin(ph) + 0.35*np.sin(2*ph) + 0.12*np.sin(3*ph)
    noise = rng.normal(0, 1, len(t)); noise = np.convolve(noise, np.ones(12)/12, 'same')
    a = np.minimum(t/0.12, 1) * np.minimum((dur - t)/0.25, 1).clip(0, 1)
    return (tone + 0.25*noise) * a

def kanun(f, dur=1.2):
    s = harp(f, dur) * 0.8 + harp(f * 2.0, dur) * 0.15
    return s

def drop(f, dur=0.6):
    t = np.arange(int(SR * dur)) / SR
    fr = f * (1 + 1.2*np.exp(-t/0.02))
    s = np.sin(2*np.pi*np.cumsum(fr)/SR)
    return s * env(t, 0.002, 0.09)

def place(total, items):
    out = np.zeros(int(SR * total))
    for start, sig, gain in items:
        i = int(SR * start); j = min(len(out), i + len(sig))
        out[i:j] += gain * sig[:j - i]
    return out

def reverb(x, mix=0.25):
    ir_t = np.arange(int(SR*1.2))/SR
    ir = rng.normal(0, 1, len(ir_t)) * np.exp(-ir_t/0.35); ir[0] = 0
    wet = np.convolve(x, ir)[:len(x)]
    wet /= (np.max(np.abs(wet)) + 1e-9)
    return (1-mix)*x/ (np.max(np.abs(x))+1e-9) + mix*wet

def save(name, x):
    x = reverb(x)
    fade = int(SR*0.3); x[-fade:] *= np.linspace(1, 0, fade)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.85
    with wave.open(os.path.join(OUT, f'ses_{name}.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    print(name, round(len(x)/SR, 1), 's')

# nur: marimba, D majör pentatonik, iki kez
seq = [74, 78, 81, 86, 81, 83]
save('nur', place(4.0, [(i*0.22, marimba(note(n)), 1.0) for i, n in enumerate(seq)] + [(1.6, marimba(note(86)), 0.8), (1.6, marimba(note(78)), 0.5)]))
# seher: arp, yükselen D minör 9 akoru
seq = [62, 65, 69, 72, 76, 81]
save('seher', place(5.0, [(i*0.16, harp(note(n), 3.5), 0.9) for i, n in enumerate(seq)]))
# ney: Hicaz dizisi (D-Eb-F#-G-A), sakin ezgi
mel = [(67, 0.7), (69, 0.5), (70, 0.5), (73, 0.6), (74, 1.4)]
items = []; tt = 0.0
for n, d in mel:
    items.append((tt, ney(note(n - 12 + 12), d + 0.15), 0.6)); tt += d
save('ney', place(tt + 0.8, items))
# kanun: Hicaz dizisinde kısa ezgi
mel = [62, 63, 66, 67, 69, 67, 66, 63, 62]
save('kanun', place(4.2, [(i*0.19, kanun(note(n + 12)), 0.9) for i, n in enumerate(mel)] + [(1.75, kanun(note(74), 2.2), 0.8)]))
# damla: su damlaları
fs = [1200, 1500, 1350, 1800, 1600]
save('damla', place(2.6, [(i*0.28 + (0.05 if i % 2 else 0), drop(f), 0.9) for i, f in enumerate(fs)]))
