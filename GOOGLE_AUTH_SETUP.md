# Google Authentication Setup Guide

## Overview
Google Sign-In is now configured for:
- ✅ **Android** - Native Google Sign-In via EAS Build
- ✅ **iOS** - Native Google Sign-In via EAS Build  
- ✅ **Web (Admin)** - Web-based OAuth (already implemented)

## For Mobile (Android & iOS)

### Prerequisites
```bash
npm install -g eas-cli
```

### Client IDs (Stored in `.env`)
```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1095425044618-7b4v6cm7rnu6pdeur52n07r484mclnag.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_iOS_CLIENT_ID=1095425044618-83hobvcm1t6pd5sds4pjcjps0k9s0fjo.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=1095425044618-bi6fnenk8g7tfef9af8lkfbe1o5i32vr.apps.googleusercontent.com
```

### Build for Android
```bash
cd civic-frontend/mobile
eas build --platform android --profile preview
```

Then scan the QR code with your Android device to install.

### Build for iOS
```bash
eas build --platform ios --profile preview
```

Then scan the QR code with your iOS device to install.

### Local Testing (Expo Go Limitations)
- **Phone OTP** ✅ Works in Expo Go
- **Aadhaar** ✅ Works in Expo Go
- **Google Sign-In** ❌ Requires native build (use EAS)

### After Building
Users can:
1. Tap "Login with Google"
2. Authenticate with their Google account
3. App receives ID token and creates session
4. Navigates to home or mandatory profile modal

## For Web Admin

### Credentials
Already configured in `.env` - no additional setup needed.

### OAuth Flow
1. User clicks "Sign in with Google"
2. Browser opens Google OAuth consent screen
3. User authorizes the app
4. Backend handles token exchange
5. User is redirected to dashboard

### Env Variable
```env
NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=1095425044618-7b4v6cm7rnu6pdeur52n07r484mclnag.apps.googleusercontent.com
```

## Backend Requirements

The backend should have:
- `POST /auth/google` endpoint for mobile (accepts `id_token`)
- `GET /auth/google/callback` endpoint for web (handles OAuth redirect)

Current implementation: ✅ Already has `/auth/google` endpoint

## Files Modified

**Mobile:**
- `app.json` - Added Google Sign-In plugin
- `app/(auth)/login.jsx` - Restored Google button with native support
- `.env` - Added client IDs
- `eas.json` - Created EAS build config

**Admin:**
- `app/login/page.js` - Added Google OAuth button and handler

## Troubleshooting

### "RNGoogleSignin could not be found"
- ✅ Fixed - Only appears in Expo Go (expected)
- Use EAS build for testing on physical devices

### Build Fails
```bash
# Clear cache and rebuild
eas build --platform android --profile preview --clear-cache
```

### Need Different Client IDs Later?
Update in Google Cloud Console and regenerate:
```bash
eas build --platform android --profile preview --clear-cache
```

## Next Steps
1. Install EAS CLI: `npm install -g eas-cli`
2. Build for your device: `eas build --platform android --profile preview`
3. Test Google Sign-In on physical device
4. Monitor backend logs for authentication issues
