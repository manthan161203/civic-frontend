import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore, registerPushToken } from '../src/store/authStore';
import { onSessionEnded } from '../src/api/client';
import { startNetworkMonitoring, stopNetworkMonitoring } from '../src/api/networkStatus';
import { startAutoFlush, stopAutoFlush } from '../src/api/offlineQueue';
import { assertConfig } from '../src/config/env';
// Sourced from the shared API types package, which derives it from the
// backend's own role declarations — so this cannot drift from what the server
// actually enforces.
import { ADMIN_ROLES } from '@civic/api-types';
import Toast from '../src/components/Toast';

SplashScreen.preventAutoHideAsync();

/*
 * Validate configuration once, at module load.
 *
 * This replaces a check that only looked for a missing `EXPO_PUBLIC_API_URL`.
 * `assertConfig()` also catches the failures that actually reach production —
 * a release build pointing at localhost, or at plain HTTP — and distinguishes
 * warnings from errors instead of alerting on both.
 */
const CONFIG_PROBLEMS = assertConfig();

if (!__DEV__ && CONFIG_PROBLEMS.some((p) => p.level === 'error')) {
  setTimeout(() => {
    Alert.alert(
      'Configuration Error',
      'This build is misconfigured and cannot reach the server. Please contact support.',
      [{ text: 'OK' }],
    );
  }, 500);
}



export default function RootLayout() {
  const { isLoading, isAuthenticated, mustChangePassword, initSession } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const notifListenerRef = useRef(null);
  const notifResponseListenerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    initSession();
  }, []);

  /*
   * Watch connectivity for the lifetime of the app.
   *
   * Started here rather than inside the banner so the state survives
   * navigation — the banner mounts and unmounts with each tab layout, and
   * connectivity is not a per-screen concern.
   */
  useEffect(() => {
    startNetworkMonitoring();
    // Replay anything queued while offline as soon as the connection returns.
    // Edge-triggered on the offline → online transition, not polled.
    startAutoFlush();
    return () => {
      stopAutoFlush();
      stopNetworkMonitoring();
    };
  }, []);

  /*
   * The transport decides when a session is unrecoverable; routing is this
   * component's job.
   *
   * The client used to reach into the auth store from inside its axios
   * interceptor via a dynamic `import()`, which hid the dependency and made
   * the transport untestable in isolation. It now just announces the event.
   */
  useEffect(
    () =>
      onSessionEnded(() => {
        useAuthStore.getState().clearSession();
        router.replace('/(auth)/login');
      }),
    [router],
  );

  // Set up push notification listeners once the app is mounted
  useEffect(() => {
    let Notifications;
    const setupListeners = async () => {
      try {
        Notifications = await import('expo-notifications');

        // Configure how notifications behave while app is foregrounded
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        // Listener for notifications received while app is open
        notifListenerRef.current = Notifications.addNotificationReceivedListener(() => {
          // Refresh notification store badge count
          import('../src/store/notificationStore').then(({ useNotificationStore }) => {
            useNotificationStore.getState().fetchNotifications();
          });
        });

        // Listener for when user taps a notification
        notifResponseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data;
            if (data?.issue_id) {
              // Navigate to issue detail, optionally with action to open modal
              const action = data?.action_type; // e.g., 'dispute', 'survey', 'complaint'
              const url = action
                ? `/issue/${data.issue_id}?action=${encodeURIComponent(action)}`
                : `/issue/${data.issue_id}`;
              router.push(url);
            } else if (data?.task_id) {
              router.push(`/task/${data.task_id}`);
            }
          }
        );
      } catch {
        // expo-notifications not available (web or simulator without push support)
      }
    };

    setupListeners();

    // Re-register FCM token when app comes back to foreground (covers reinstall/token expiry)
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        registerPushToken();
      }
      appStateRef.current = nextState;
    });

    return () => {
      if (notifListenerRef.current?.remove) notifListenerRef.current.remove();
      if (notifResponseListenerRef.current?.remove) notifResponseListenerRef.current.remove();
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    const inAuth = segments[0] === '(auth)';
    const inAdminBlocked = segments[0] === 'admin-blocked';
    const inChangePassword = segments.join('/').includes('change-password');
    const inSetup = segments.join('/').includes('setup');
    const { user } = useAuthStore.getState();
    const isCitizen = !user?.role || user?.role === 'citizen';

    // Not authenticated → send to login
    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
      return;
    }

    // Not authenticated but already in auth screens → do nothing
    if (!isAuthenticated) return;

    // Authenticated below this point ─────────────────────────────────────────

    // Force password change gate — workers on first login must change password
    if (mustChangePassword && !inChangePassword) {
      router.replace('/(auth)/change-password');
      return;
    }

    // Citizen-only: require complete profile before accessing app
    // (Workers are set up by admins; admins use web dashboard)
    if (isCitizen && !inSetup && !inChangePassword && !inAuth) {
      const isProfileIncomplete = !user?.name
        || !user?.email
        || !user?.ward_id
        || !user?.latitude
        || !user?.longitude
        || !user?.language;

      if (isProfileIncomplete) {
        router.replace('/(citizen)/setup');
        return;
      }
    }

    // Route authenticated user out of auth screens to the right home
    // Skip if on change-password (auth screen that requires being authenticated)
    if (inAuth && !inChangePassword) {
      if (ADMIN_ROLES.includes(user?.role)) {
        router.replace('/admin-blocked');
      } else if (user?.role === 'worker') {
        router.replace('/(worker)/');
      } else {
        router.replace('/(citizen)/');
      }
      return;
    }

    // Block admin users from citizen/worker screens
    if (ADMIN_ROLES.includes(user?.role) && !inAdminBlocked) {
      router.replace('/admin-blocked');
    }
  }, [isLoading, isAuthenticated, mustChangePassword, segments]);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' }}>
          <ActivityIndicator size="large" color="#1a56db" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    /*
     * SafeAreaProvider is what makes `useSafeAreaInsets` return real numbers.
     *
     * `react-native-safe-area-context` was a declared dependency imported by
     * nothing, so every screen either hardcoded a padding (`paddingTop: 60`
     * standing in for a notch) or ran under the status bar and the home
     * indicator. Two screens used the deprecated core `SafeAreaView`, which is
     * iOS-only — and SDK 54 defaults Android to edge-to-edge, so those were
     * broken on Android specifically.
     *
     * It has to sit above the navigator: React Navigation reads the same
     * context to inset its own header and tab bar.
     */
    <SafeAreaProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(citizen)" />
        <Stack.Screen name="(worker)" />
        <Stack.Screen name="admin-blocked" />
        <Stack.Screen name="issue/[id]" options={{ headerShown: true, title: 'Issue Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="task/[id]" options={{ headerShown: true, title: 'Task Details', headerBackTitle: 'Back' }} />
      </Stack>
      <Toast />
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
