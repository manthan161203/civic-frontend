/**
 * Expo app configuration.
 *
 * This replaces the static `app.json` so the build can target three
 * environments. Pick one with `APP_ENV`:
 *
 *   APP_ENV=development npx expo start
 *   APP_ENV=staging     eas build --profile staging
 *   APP_ENV=production  eas build --profile production
 *
 * Staging and development get their own bundle identifier and display name, so
 * all three can sit on one device without overwriting each other — and so
 * nobody files a bug from a staging build thinking it was production.
 *
 * Secrets are NOT defined here. `extra` carries the API URL, the environment
 * name and the Google client IDs, all of which are public by nature: anything
 * shipped in a mobile binary is readable by whoever holds the binary. Real
 * secrets belong to the backend.
 */

const APP_ENV = process.env.APP_ENV || process.env.EXPO_PUBLIC_APP_ENV || 'development';

/**
 * Per-environment settings.
 *
 * `apiUrl` falls back to `EXPO_PUBLIC_API_URL` in development so a device on
 * the same LAN can be pointed at a dev machine without editing this file.
 * Staging and production read from the environment too, because their real
 * hosts belong in CI, not in version control.
 */
const ENVIRONMENTS = {
  development: {
    name: 'Civic (Dev)',
    slug: 'civic',
    scheme: 'civic-dev',
    iosBundleId: 'com.civic.app.dev',
    androidPackage: 'com.civic.app.dev',
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
    // Required for http://<lan-ip>:8000 during development. Turned off below
    // for staging and production, where cleartext is a real risk.
    usesCleartextTraffic: true,
  },
  staging: {
    name: 'Civic (Staging)',
    slug: 'civic',
    scheme: 'civic-staging',
    iosBundleId: 'com.civic.app.staging',
    androidPackage: 'com.civic.app.staging',
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://staging-api.civic.example',
    usesCleartextTraffic: false,
  },
  production: {
    name: 'Civic',
    slug: 'civic',
    scheme: 'civic',
    iosBundleId: 'com.civic.app',
    androidPackage: 'com.civic.app',
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.civic.example',
    usesCleartextTraffic: false,
  },
};

const env = ENVIRONMENTS[APP_ENV];

if (!env) {
  throw new Error(
    `Unknown APP_ENV "${APP_ENV}". Expected one of: ${Object.keys(ENVIRONMENTS).join(', ')}`,
  );
}

// Fail the build rather than shipping a production binary aimed at a laptop.
if (APP_ENV === 'production' && /localhost|127\.0\.0\.1/.test(env.apiUrl)) {
  throw new Error(`Refusing to build production against a local API URL: ${env.apiUrl}`);
}

module.exports = () => ({
  expo: {
    name: env.name,
    slug: env.slug,
    platforms: ['android', 'ios', 'web'],
    version: '1.0.0',
    scheme: env.scheme,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1a56db',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: env.iosBundleId,
      googleServicesFile: '../credentials/GoogleService-Info.plist',
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'Civic needs your location to show nearby issues.',
        NSCameraUsageDescription: 'Civic needs camera access to photograph issues.',
        NSPhotoLibraryUsageDescription: 'Civic needs photo library access to attach photos.',
        NSMicrophoneUsageDescription: 'Civic needs microphone access to record voice reports.',
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GOOGLE_iOS_CLIENT_ID || ''}`,
            ],
          },
        ],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1a56db',
      },
      package: env.androidPackage,
      usesCleartextTraffic: env.usesCleartextTraffic,
      googleServicesFile: '../credentials/google-services.json',
      config: {
        googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY },
      },
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.RECORD_AUDIO',
      ],
    },
    web: { bundler: 'metro' },
    plugins: [
      'expo-router',
      // Backs the token store: iOS Keychain, Android Keystore-encrypted prefs.
      'expo-secure-store',
      'expo-font',
      ['expo-camera', { cameraPermission: 'Allow Civic to access your camera to photograph issues.' }],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Civic to access your photo library to attach photos.',
          cameraPermission: 'Allow Civic to access your camera to photograph issues.',
        },
      ],
      ['expo-location', { locationAlwaysAndWhenInUsePermission: 'Allow Civic to use your location.' }],
      ['expo-notifications', { icon: './assets/icon.png', color: '#1a56db' }],
    ],
    extra: {
      // Read by src/config/env.js. Baked in at build time, so a released
      // binary cannot be re-pointed by the environment it happens to run in.
      appEnv: APP_ENV,
      apiUrl: env.apiUrl,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_iOS_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,

      router: {},
      eas: { projectId: '9332e1d8-b6d4-469e-ae01-dda9806aa467' },
      cli: { appVersionSource: 'local' },
    },
  },
});
