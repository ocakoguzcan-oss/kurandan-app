# Zil sesleri

`assets/sounds/ses_*.caf` dosyaları bu betiklerle üretildi. Enstrüman örnekleri:
**VS Chamber Orchestra: Community Edition (VSCO-2 CE)**, CC0 1.0 (kamu malı) —
https://github.com/sgossner/VSCO-2-CE

Kısa ezanlar (`ses_kisa1/2/3`) uygulamanın kendi ezan kayıtlarından kesildi (izinli).

Üretim: `python3 yap.py <VSCO klasörü> <çıktı>` (kanun), `yap2.py` (rüzgâr çanı),
`yap3.py` (masa saati), `yap4.py` (melodiler, ding dong, bip, uyan, yüksek ses, kuş).
Sonra: `ffmpeg -i x.wav -af loudnorm=I=-13:TP=-1.2 ... -ac 1 -ar 44100 -c:a adpcm_ima_qt ses_x.caf`
