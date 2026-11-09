// Kurandan widget eklentisi (@bacons/apple-targets): kilit ekranı ve ana ekran "sıradaki vakit"
// widget'ı ile sabah ezanı alarmının (AlarmKit) Canlı Etkinlik görünümü.
// Veriyi uygulama App Group'a yazar (src/lib/vakitWidget.ts → modules/ezan-native).
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'KurandanWidget',
  displayName: 'Kurandan.ai',
  bundleIdentifier: '.widget',
  deploymentTarget: '17.0',
  icon: '../../assets/icon.png',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  // AlarmKit (iOS 26+) listeye eklenmez: kullanıldığı yerler @available ile korunur ve otomatik zayıf bağlanır
  colors: {
    $accent: '#18583C',
    $widgetBackground: '#F3ECDC',
    yesil: { color: '#18583C', darkColor: '#7FC29B' },
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
