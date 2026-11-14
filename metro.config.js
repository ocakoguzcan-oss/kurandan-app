// Metro ayarı: Android bildirim sesleri OGG biçiminde (assets/sounds-android); Metro varsayılan olarak .ogg'u tanımaz.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('ogg')) config.resolver.assetExts.push('ogg');

module.exports = config;
