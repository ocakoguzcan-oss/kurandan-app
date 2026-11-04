// app.json'daki ayarları kullanır; yalnızca güncelleme uyumluluğunu (runtimeVersion) sürüme göre seçer.
//
// - Expo Go denemeleri (main dalı): runtimeVersion = Expo SDK sürümü, çünkü Expo Go yalnızca bunu tanır.
// - App Store sürümü (APP_VARIANT=production): runtimeVersion = uygulama sürümü (app.json → version).
//   Yeni yerel paket, izin ya da ikon gibi bir değişiklikte app.json'daki "version" artırılır
//   (ör. 1.0.0 → 1.1.0) ve yeni derleme alınır; eski sürüme uyumsuz güncelleme gitmez.
module.exports = ({ config }) => ({
  ...config,
  runtimeVersion: process.env.APP_VARIANT === 'production' ? { policy: 'appVersion' } : config.runtimeVersion,
});
