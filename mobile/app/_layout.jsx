import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore, registerPushToken } from '../src/store/authStore';
import Toast from '../src/components/Toast';

SplashScreen.preventAutoHideAsync();

// Validate essential environment variables
const validateEnvironment = () => {
  const requiredEnvVars = ['EXPO_PUBLIC_API_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    if (!__DEV__) {
      // In production, this would prevent app from running
      setTimeout(() => {
        Alert.alert(
          'Configuration Error',
          'Required API configuration is missing. Please contact support.',
          [{ text: 'Exit' }]
        );
      }, 500);
    }
  }
};

validateEnvironment();

const ADMIN_ROLES = ['ward_admin', 'taluka_admin', 'district_admin', 'admin'];

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
      <GestureHandlerRootView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' }}>
        <ActivityIndicator size="large" color="#1a56db" />
      </GestureHandlerRootView>
    );
  }

  return (
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
  );
}
