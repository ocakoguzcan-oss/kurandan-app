Pod::Spec.new do |s|
  s.name           = 'EzanNative'
  s.version        = '1.0.0'
  s.summary        = 'Kurandan: kilit ekranı widget verisi ve sabah ezanı alarmı (AlarmKit)'
  s.description    = s.summary
  s.author         = 'Kurandan.ai'
  s.homepage       = 'https://github.com/ocakoguzcan-oss/kurandan-app'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }
  # AlarmKit yalnız iOS 26+'da var; eski sürümlerde çökmemesi için zayıf bağlanır
  s.weak_frameworks = 'AlarmKit', 'ActivityKit', 'WidgetKit'
  s.frameworks = 'MapKit'

  s.source_files = '**/*.{h,m,swift}'
end
