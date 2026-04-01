import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/store/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isLoading, isAuthenticated, initSession } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      // Route based on role
      // Default to citizen — layout handles role routing
      router.replace('/(citizen)/');
    }
  }, [isLoading, isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(citizen)" />
        <Stack.Screen name="(worker)" />
        <Stack.Screen name="issue/[id]" options={{ headerShown: true, title: 'Issue Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="task/[id]" options={{ headerShown: true, title: 'Task Details', headerBackTitle: 'Back' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
