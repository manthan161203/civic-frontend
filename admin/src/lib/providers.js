'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { onSessionEnded } from '../api/http';
import { canVisit } from '../api/permissions';
import { ToastContainer } from '../components/Toast';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';

function Splash({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-card bg-primary">
          <span className="text-xl font-black text-white">C</span>
        </div>
        <p className="text-sm text-ink-muted">{message}</p>
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

    // An invited admin signs in with a temporary password and the backend sets
    // `must_change_password`. There was no console screen for it, so they
    // landed on the dashboard with a flag nothing acted on. Everything else is
    // blocked until it is cleared.
    if (user?.must_change_password && pathname !== '/change-password') {
      router.replace('/change-password');
      return;
    }

    // Role gating, not just authentication. The sidebar already hid links a
    // given tier could not use, but typing the URL rendered the page anyway —
    // and then every request on it 403'd, which the old interceptor treated as
    // a dead session and logged the user out. Redirecting to the dashboard is
    // the honest answer: you are signed in, this page is not yours.
    if (pathname !== '/change-password' && !canVisit(user, pathname)) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, user, router]);

  if (isLoading && pathname !== '/login') return <Splash message="Loading…" />;

  // Avoid painting a page the user is about to be redirected away from.
  if (
    !isLoading &&
    isAuthenticated &&
    pathname !== '/login' &&
    pathname !== '/change-password' &&
    !canVisit(user, pathname)
  ) {
    return <Splash message="Redirecting…" />;
  }

  return children;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,

      // Retry is owned by the transport, not by Query.
      //
      // `withRetry` in src/api/http.js already makes up to 3 attempts with
      // exponential backoff and jitter, gated on the same `ApiError.retryable`
      // predicate. Layering Query's retry on top multiplied them: a single 503
      // became **up to 9 requests over roughly ten seconds** before the user
      // saw anything, and the tab sat apparently frozen throughout.
      //
      // This was dormant only because nothing called `useQuery` yet — the
      // QueryClient was configured and never used. Adopting Query without this
      // line would have switched the bug on.
      //
      // The transport is the right owner: it has the jitter, it has the
      // predicate, and it also covers mutations, which Query does not retry.
      retry: false,

      // Query cancels in-flight requests on unmount only if the queryFn
      // forwards the `signal` it is handed. Every method in src/api/index.js
      // accepts a second `config` argument for exactly that.
      refetchOnWindowFocus: false,
    },
  },
});

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Mounted once, above the routes: `useConfirm()` resolves a promise from
          this single dialog, which is what lets the fourteen `window.confirm`
          call sites stay one-liners inside their async handlers. */}
      <ConfirmProvider>
        <AuthGuard>{children}</AuthGuard>
      </ConfirmProvider>
      <ToastContainer />
    </QueryClientProvider>
  );
}
