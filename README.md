# Kurandan.ai — mobil uygulama

Expo (React Native) ile yazılmış iOS + Android uygulaması.

**Özellikler:** namaz vakitleri ve geri sayım · kıble pusulası · günün duası · zikirmatik · Cuma Instagram story görseli · Instagram Reels akışı · Ramazan imsakiyesi (81 il) · vakit hatırlatma bildirimleri.

---

## 1. Bilgisayarda çalıştırma

Gerekenler: [Node.js 20+](https://nodejs.org), telefonda **Expo Go** uygulaması.

```bash
cd kurandan-app
npm install
npx expo install --fix     # paket sürümlerini Expo SDK'sıyla eşitler
npx expo start
```

Çıkan QR kodu telefonla okutun. Expo Go'da her şey çalışır; tek fark **Cuma story** doğrudan Instagram Story ekranını değil, telefonun genel paylaşım menüsünü açar (Instagram oradan da seçilebilir).

Tam sürümü (Instagram Story'ye doğrudan paylaşım dahil) telefonda denemek için:

```bash
npx expo run:android      # Android Studio kurulu olmalı
npx expo run:ios          # Mac + Xcode gerekir
```

Vakit hesaplamasını kontrol etmek için: `TZ=Europe/Istanbul npm run test:vakit`

---

## 2. Proje yapısı

```
app/                   Ekranlar (dosya adı = sayfa adresi)
  (tabs)/index.tsx     Ana Sayfa — sıradaki vakit, günün duası, kısayollar
  (tabs)/kible.tsx     Kıble pusulası
  (tabs)/zikir.tsx     Zikirmatik
  (tabs)/reels.tsx     Instagram Reels
  (tabs)/ayarlar.tsx   Vakit hatırlatma ayarları
  dua.tsx              Günün duası (detay, paylaş, kaydet)
  cuma.tsx             Cuma story görseli
  imsakiye.tsx         Ramazan imsakiyesi
  konum.tsx            İl seçimi / GPS
src/
  lib/prayerTimes.ts   Diyanet yöntemiyle vakit + kıble hesabı (internetsiz)
  lib/hijri.ts         Hicri tarih + Ramazan tarihleri
  lib/notifications.ts Hatırlatma bildirimleri
  lib/reels.ts         Reels sunucusundan veri çekme
  data/                81 il, dualar, Cuma ayetleri, zikirler
  theme.ts             Marka renkleri ve yazı tipleri
server/                Reels sunucusu (Vercel)
assets/                Logo, uygulama ikonu, açılış ekranı
```

### Sık yapılacak değişiklikler

| Ne | Nerede |
|---|---|
| Dua eklemek / düzeltmek | `src/data/dualar.ts` |
| Cuma story ayetleri, renk şablonları | `src/data/cuma.ts` |
| Zikir listesi ve hedef sayılar | `src/data/zikirler.ts` |
| Renkler, yazı tipleri | `src/theme.ts` |
| Yeni yılın Ramazan tarihi | `src/lib/hijri.ts` → `RAMAZANLAR` (Diyanet takvimi açıklanınca bir satır ekleyin) |
| Instagram profil adresi | `app/(tabs)/reels.tsx` → `PROFILE_URL` |
| İlk açılış tanıtımındaki yazılar | `src/tour/Tour.tsx` → `STEPS` |
| Kandil ve dini günler | `src/data/diniGunler.ts` (Diyanet takvimi açıklanınca ekleyin) |
| Ezan kaydı | `assets/sounds/ezan.wav` dosyasını değiştirin (WAV, en fazla 30 sn), sonra `src/config.ts` → `EZAN_KAYDI_HAZIR = true` |

> **Önemli:** `src/data/dualar.ts` içindeki Arapça metinleri, okunuşları ve mealleri yayından önce bir hocaya kontrol ettirin.

---

## 3. Kur'an-ı Kerim sekmesi

Medine Mushafı'nın 604 sayfası gerçek satır düzeniyle gösterilir; sayfalar ilk açılışta indirilir, sonra cihazda saklanır. Bir satıra dokununca yalnızca o satır, Play ile sayfa okunur; sayfa bitince çevirme sesiyle bir sonraki sayfadan kesintisiz devam eder. Okunan kelime renkle vurgulanır. Tilavet: Mahmud Halil el-Husarî.

Veri, font ve sesler Quran Foundation'dan (quran.com) gelir; uygulamada kaynak belirtilir. Kullanım koşulları gereği bir **Quran Foundation Developer Console** hesabı açın: https://api-docs.quran.foundation/docs/quickstart

## 4. Vakitler nasıl hesaplanıyor?

Vakitler internet olmadan, cihazda Diyanet İşleri Başkanlığı yöntemiyle hesaplanır (imsak 18°, yatsı 17°, temkinler: güneş −7, öğle +5, ikindi +4, akşam +7 dk). Kasım 2026 İstanbul verisiyle karşılaştırıldığında 18 vakitten 15'i birebir aynı, kalanlarda 1 dakika fark var. Diyanet ilçe bazında kendi koordinatlarını kullandığı için ilçelerde 1–2 dakika fark çıkabilir.

Hicri tarih aritmetik yöntemle hesaplanır ve Diyanet takviminden ±1 gün sapabilir. Ramazan günleri ise Diyanet'in ilan ettiği tarihlere sabitlenmiştir (1448: 8 Şubat – 8 Mart 2027).

---

## 4. Reels sunucusu (Instagram'dan otomatik video)

Instagram erişim anahtarı uygulamanın içine konursa çalınabilir. Bu yüzden `server/` klasöründe anahtarı saklayan küçük bir sunucu var; uygulama videoları oradan çeker.

1. **Instagram hesabını Profesyonel yapın.** Instagram → Ayarlar → Hesap türü → *İşletme* veya *İçerik üreticisi*.
2. **Meta geliştirici uygulaması açın:** [developers.facebook.com](https://developers.facebook.com) → *Uygulama oluştur* → kullanım türü olarak **Instagram API with Instagram Login**'i ekleyin.
3. Uygulamanın Instagram ayarlarında kurandan.ai hesabını ekleyip **erişim anahtarı oluşturun** (izin: `instagram_business_basic`). Bu anahtar 60 gün geçerli uzun ömürlü anahtardır.
4. **Sunucuyu Vercel'e yükleyin:** [vercel.com](https://vercel.com) → *New Project* → bu reponun `server` klasörünü kök dizin seçin. *Environment Variables* bölümüne `server/.env.example` içindeki üç değeri girin.
5. Yayınlandıktan sonra `https://<proje-adınız>.vercel.app/api/reels` adresini tarayıcıda açıp videoların listelendiğini görün.
6. `app.json` içinde `"reelsApiUrl": "https://<proje-adınız>.vercel.app"` yazın.

**Anahtarı yenileme:** 60 gün dolmadan `https://<proje>.vercel.app/api/refresh-token?secret=<ADMIN_SECRET>` adresini açın, dönen yeni `access_token` değerini Vercel'deki `IG_ACCESS_TOKEN` ile değiştirin. (Takvime ayda bir hatırlatma koymanız yeterli.)

**Kategoriler:** Videolar açıklamadaki etiketlere göre gruplanır — `#sure`, `#ayet`, `#kuran` → Sureler; `#dua` → Dualar; `#hadis` → Hadisler.

---

## 5. Instagram Story'ye doğrudan paylaşım

Meta, Story paylaşımı için bir **Facebook App ID** ister. 4. adımda açtığınız Meta uygulamasının kimliğini (Uygulama paneli → *Uygulama Kimliği*) `app.json` → `"facebookAppId"` alanına yazın. Boş bırakılırsa uygulama genel paylaşım menüsünü açar.

---

## 6. Güncelleme akışı

| Dal | Ne olur |
|---|---|
| `main` | Expo Go'da denenir (`.eas/workflows/expo-go-yayini.yml`) |
| `yayin` | App Store'daki kullanıcılara anında güncelleme (`magaza-guncelleme.yml`) |
| elle: **App Store sürümü** | Yeni derleme + App Store Connect'e gönderim (`magaza-surumu.yml`) |

Yeni yerel paket, izin, ikon ya da SDK değişikliğinde önce `app.json` → `version` artırılır, sonra "App Store sürümü" çalıştırılır.
Gizlilik ve destek sayfaları `docs/` klasöründedir (GitHub Pages ile yayınlanır).

## 7. Mağazalarda yayınlama

Gerekenler: [Apple Developer Program](https://developer.apple.com/programs/) üyeliği (yıllık ücretli) ve [Google Play Console](https://play.google.com/console) hesabı (tek seferlik ücret).

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all --profile production
eas submit --platform all
```

Önce `eas build --profile preview --platform android` ile test APK'sı alıp telefonlara kurabilirsiniz.

Mağaza formlarında: uygulama konumu yalnızca cihazda vakit/kıble hesabı için kullanır, sunucuya göndermez; hesap, reklam veya kişisel veri toplama yoktur.

Kimlikler: iOS `ai.kurandan.app`, Android `ai.kurandan.app` (değiştirmek isterseniz `app.json`'da ilk yayından **önce** değiştirin).

---

## 7. Hatırlatmalar hakkında

Bildirimler önümüzdeki 7 gün için kurulur ve uygulama her açıldığında yenilenir (iOS aynı anda en fazla 64 planlı bildirime izin verir). Kullanıcı uygulamayı bir haftadan uzun açmazsa hatırlatmalar durur; ileride arka planda yenileme (`expo-background-task`) eklenebilir. Ezan sesiyle bildirim için bir ses dosyası `assets/` klasörüne eklenip `expo-notifications` ayarına tanıtılmalı.
