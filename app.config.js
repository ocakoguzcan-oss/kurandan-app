// app.json'un üstüne platforma göre küçük ayarlar.
// Bildirim sesleri: iOS CAF ister, Android'de CAF çalmaz; ayrıca iki platformun dosyaları aynı adla
// res/raw'a girerse Android derlemesi bozulur. Bu yüzden Android derlemesinde (EAS_BUILD_PLATFORM=android)
// assets/sounds-android/*.ogg kullanılır.
// Google Maps anahtarı: GitHub secret GOOGLE_MAPS_API_KEY → derleme iş akışı onu EAS ortam değişkeni yapar.
module.exports = ({ config }) => {
  if (process.env.EAS_BUILD_PLATFORM !== 'android') return config;
  const plugins = config.plugins.map((p) => {
    if (!Array.isArray(p) || p[0] !== 'expo-notifications') return p;
    const [name, opts] = p;
    return [
      name,
      { ...opts, sounds: (opts.sounds || []).map((s) => s.replace('./assets/sounds/', './assets/sounds-android/').replace(/\.caf$/, '.ogg')) },
    ];
  });
  // Android haritası (Yakın Camiler, Kâbe yolu): Google Maps anahtarı EAS ortam değişkeninden gelir.
  // Anahtar yoksa uygulama haritasız (yalnız liste) çalışır; kodda HARITA_VAR bunu denetler.
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const android = mapsKey
    ? { ...config.android, config: { ...(config.android?.config || {}), googleMaps: { apiKey: mapsKey } } }
    : config.android;
  return { ...config, android, plugins };
};
