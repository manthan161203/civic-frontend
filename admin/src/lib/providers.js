'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { onSessionEnded } from '../api/http';
import { canVisit } from '../api/permissions';
import { ApiError } from '../api/errors';
import { ToastContainer } from '../components/Toast';

function Splash({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-3">
          <span className="text-white font-black text-xl">C</span>
        </div>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  );
}

function AuthGuard({ children }) {
  const { isAuthenticated, isLoading, user, init, clearSession } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    init();
  }, [init]);

  // The transport layer decides when a session is unrecoverable; routing is
  // this component's job. Previously the axios interceptor assigned
  // `window.location.href` itself, which forced a full page reload on every
  // token expiry and made the client impossible to test in isolation.
  useEffect(
    () =>
      onSessionEnded(() => {
        clearSession();
        router.replace('/login');
      }),
    [clearSession, router],
  );

  useEffect(() => {
    if (isLoading || pathname === '/login') return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Role gating, not just authentication. The sidebar already hid links a
    // given tier could not use, but typing the URL rendered the page anyway —
    // and then every request on it 403'd, which the old interceptor treated as
    // a dead session and logged the user out. Redirecting to the dashboard is
    // the honest answer: you are signed in, this page is not yours.
    if (!canVisit(user, pathname)) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, user, router]);

  if (isLoading && pathname !== '/login') return <Splash message="Loading…" />;

  // Avoid painting a page the user is about to be redirected away from.
  if (!isLoading && isAuthenticated && pathname !== '/login' && !canVisit(user, pathname)) {
    return <Splash message="Redirecting…" />;
  }

  return children;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Do not burn retries on errors that will fail identically every time —
      // a 403 or a 422 is an answer, not a hiccup. The transport already
      // retries the genuinely transient cases with backoff before it rejects.
      retry: (failureCount, error) =>
        error instanceof ApiError ? error.retryable && failureCount < 2 : failureCount < 1,
    },
  },
});

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>{children}</AuthGuard>
      <ToastContainer />
    </QueryClientProvider>
  );
}
