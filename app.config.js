// app.json'un üstüne platforma göre küçük ayarlar.
// Bildirim sesleri: iOS CAF ister, Android'de CAF çalmaz; ayrıca iki platformun dosyaları aynı adla
// res/raw'a girerse Android derlemesi bozulur. Bu yüzden Android derlemesinde (EAS_BUILD_PLATFORM=android)
// assets/sounds-android/*.ogg kullanılır.
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
  return { ...config, plugins };
};
