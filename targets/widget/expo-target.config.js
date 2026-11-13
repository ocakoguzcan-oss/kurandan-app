// Kurandan widget eklentisi (@bacons/apple-targets): kilit ekranı ve ana ekran "sıradaki vakit"
// widget'ı, ana ekran manzara widget'ı (vakte göre gökyüzü + cami), Canlı Etkinlik ve sabah ezanı alarmının (AlarmKit) Canlı Etkinlik görünümü.
// Veriyi uygulama App Group'a yazar (src/lib/vakitWidget.ts → modules/ezan-native).
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'KurandanWidget',
  displayName: 'Kurandan.ai',
  bundleIdentifier: '.widget',
  deploymentTarget: '17.0',
  icon: '../../assets/icon.png',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
  // Ana ekran "manzara" widget'ının mübarek mekân çizimleri (scripts/widget-cami.py ile üretilir)
  images: {
    cami_kabe_gunduz: '../../assets/widget/cami_kabe_gunduz.png',
    cami_kabe_gece: '../../assets/widget/cami_kabe_gece.png',
    cami_aksa_gunduz: '../../assets/widget/cami_aksa_gunduz.png',
    cami_aksa_gece: '../../assets/widget/cami_aksa_gece.png',
    cami_nebevi_gunduz: '../../assets/widget/cami_nebevi_gunduz.png',
    cami_nebevi_gece: '../../assets/widget/cami_nebevi_gece.png',
    cami_kuba_gunduz: '../../assets/widget/cami_kuba_gunduz.png',
    cami_kuba_gece: '../../assets/widget/cami_kuba_gece.png',
  },
  // AlarmKit (iOS 26+) listeye eklenmez: kullanıldığı yerler @available ile korunur ve otomatik zayıf bağlanır
  colors: {
    $accent: '#18583C',
    $widgetBackground: { color: '#F3ECDC', darkColor: '#141B17' },
    yesil: { color: '#18583C', darkColor: '#7FC29B' },
    altin: { color: '#7E5718', darkColor: '#E2C27A' },
    murekkep: { color: '#1F2A24', darkColor: '#EDE7D8' },
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
