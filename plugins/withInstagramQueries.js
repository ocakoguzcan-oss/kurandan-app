// Android 11+ cihazlarda uygulamanın Instagram'ın yüklü olup olmadığını görebilmesi için
// AndroidManifest'e <queries> ekler (Story paylaşımı için gerekli).
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withInstagramQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries || [];
    const already = manifest.queries.some((q) =>
      (q.package || []).some((p) => p.$['android:name'] === 'com.instagram.android')
    );
    if (!already) {
      manifest.queries.push({
        package: [{ $: { 'android:name': 'com.instagram.android' } }],
        intent: [
          {
            action: [{ $: { 'android:name': 'com.instagram.share.ADD_TO_STORY' } }],
          },
        ],
      });
    }
    return cfg;
  });
};
