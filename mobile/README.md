# Civic Mobile — Run & Development Guide

This document explains how to run the mobile frontend in different ways (Android, iOS, Web, LAN, Tunnel) and how to build for production.

Prerequisites
- Node.js v18+ and `npm` (or `pnpm`)
- Git
- For native Android: Android Studio (or a physical Android device + USB debugging)
- For native iOS: macOS with Xcode (or a physical iOS device)
- Expo CLI (optional): `npm install -g expo-cli` or use `npx expo` commands

Environment
- Copy environment variables into a `.env` file at the `mobile/` folder root (example keys used by the app):
  - `EXPO_PUBLIC_API_URL` (backend API base URL)
  - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (for native Google Maps usage)

Quick setup
```
cd civic-frontend/mobile
npm install        # install dependencies
# or, for CI: npm ci
```

Run in development (Expo)
- Start the Expo dev server (opens Expo Dev Tools):
```
npx expo start
# or use npm script
# npm run start
```
- Controls in the terminal (press keys):
  - `a` → open Android (emulator / device)
  - `i` → open iOS simulator (macOS)
  - `w` → open Web
  - `s` → switch to development build

Run specific platforms
- Android (emulator or connected device)
```
npx expo start --android
```
- iOS (macOS only)
```
npx expo start --ios
```
- Web (browser)
```
npx expo start --web
# then open the URL printed by Expo (e.g. http://localhost:8084)
```

Remote testing: LAN vs Tunnel
- LAN (device on same Wi-Fi)
```
npx expo start --lan
```
- Tunnel (works across networks) — requires ngrok
```
npx expo start --tunnel
# If prompted to install @expo/ngrok globally, run:
# sudo npm install -g @expo/ngrok@^4.1.0
```
If global install fails, use LAN mode or manually install `@expo/ngrok` with appropriate permissions.

Notes for Web
- The app uses a web-specific map component (react-leaflet) — make sure `react-leaflet` and `leaflet` are installed in `mobile/` (they are included in the current changes).
- If you see an error about `react-native` internals when opening web, ensure `app.json` includes `"web"` in `platforms` and that you have the web map files present.

Build / Production
- Use EAS for production builds (recommended):
```
# install EAS CLI
npm install -g eas-cli

# configure and run
eas build -p android
eas build -p ios   # requires Apple credentials
```

Simple Troubleshooting
- Port conflicts: If Expo says port 8081 is in use, allow Expo to use another port or stop the other process.
- SecureStore on web: code includes a shim that uses `localStorage` in browsers. If you see SecureStore errors, reinstall dependencies and restart Expo.
- Native-only packages on web (e.g., `react-native-maps`) will fail on web; the code uses a web-specific component for browser builds.
- If `npx expo start --tunnel` fails installing ngrok automatically, run the global install command above or use `--lan`.

Git & pushing
```
# commit local changes
git add .
git commit -m "docs(mobile): add README with run instructions"
git push origin HEAD:development
```

If you'd like, I can commit & push this README for you. Want me to push it to `development` now?