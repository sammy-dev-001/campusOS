const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Config plugin to fix the manifest merger conflict with react-native-android-notification-listener.
 * That library declares android:allowBackup="false" which conflicts with our android:allowBackup="true".
 * Adding tools:replace="android:allowBackup" tells the merger to use our value.
 */
const withAllowBackupFix = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (mainApplication?.$) {
      mainApplication.$['tools:replace'] =
        (mainApplication.$['tools:replace']
          ? mainApplication.$['tools:replace'] + ',android:allowBackup'
          : 'android:allowBackup');
      // Ensure tools namespace is declared on the manifest root
      config.modResults.manifest.$['xmlns:tools'] =
        'http://schemas.android.com/tools';
    }
    return config;
  });
};

// Re-export app.json config with the plugin injected
const appJson = require('./app.json');
module.exports = {
  ...appJson.expo,
  plugins: [
    ...(appJson.expo.plugins || []),
    withAllowBackupFix,
  ],
};
