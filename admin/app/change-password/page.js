'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider } from 'react-hook-form';

import { adminApi } from '@/api/index';
import { useApiForm } from '@/hooks/useApiForm';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { logger } from '@/lib/logger';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TextField, FormError } from '@/components/ui/form';
import CivicLogo from '@/components/ui/CivicLogo';

/**
 * Forced password change.
 *
 * The backend has supported this the whole time — `POST /auth/change-password`
 * skips current-password verification when `must_change_password` is true, and
 * every login response carries that flag. There was simply no screen, so an
 * invited admin whose account required a password change had nowhere to do it.
 * The mobile app has had this flow for ages; the console did not.
 *
 * ── The behaviour that shapes this screen ────────────────────────────────────
 *
 * On success the backend calls `revoke_all_user_tokens()` and sets
 * `tokens_valid_from`. **That includes the caller's own token.** So there is no
 * "carry on where you left off" — the session is deliberately dead, and the
 * only correct next step is a fresh sign-in. Trying to keep the user here would
 * produce a screen where every subsequent request 401s.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const addToast = useUiStore((s) => s.addToast);
  const [done, setDone] = useState(false);

  // `must_change_password` is the reason this route exists; anyone who lands
  // here without it is just changing their password voluntarily, which is also
  // fine — the current-password field appears for them.
  const forced = Boolean(user?.must_change_password);

  const form = useApiForm({
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
    onSubmit: (values) =>
      adminApi
        .changePassword(
          forced ? undefined : values.current_password,
          values.new_password,
          values.confirm_password,
        )
        .then((r) => r.data),
    onSuccess: () => {
      logger.info('ChangePassword', 'Password changed; all sessions revoked');
      setDone(true);
      addToast('Password changed. Please sign in again.', 'success', 5000);
      // Give the toast a beat, then end the session for real.
      setTimeout(() => {
        clearSession();
        router.replace('/login');
      }, 1500);
    },
  });

  const newPassword = form.watch('new_password');

  // Someone who is not forced and did not come here deliberately has no reason
  // to be on this screen.
  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <CivicLogo size="lg" />
          <div>
            <h1 className="text-lg font-semibold text-ink">
              {forced ? 'Set a new password' : 'Change your password'}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {forced
                ? 'Your account was created with a temporary password. Choose your own to continue.'
                : 'You will be signed out of every device afterwards.'}
            </p>
          </div>
        </div>

        <Card>
          {done ? (
            <div className="py-6 text-center">
              <p className="text-sm font-medium text-ink">Password changed</p>
              <p className="mt-1 text-sm text-ink-muted">
                Taking you to the sign-in page…
              </p>
            </div>
          ) : (
            <FormProvider {...form}>
              <form onSubmit={form.submit} className="space-y-4" noValidate>
                <FormError message={form.serverError} />

                {/* Omitted when forced: the backend does not check it in that
                    case, and asking for a password the user was given in an
                    email is friction with no security value. */}
                {!forced && (
                  <TextField
                    name="current_password"
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    rules={{ required: 'Enter your current password' }}
                  />
                )}

                <TextField
                  name="new_password"
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  hint="At least 8 characters."
                  rules={{
                    required: 'Choose a new password',
                    minLength: { value: 8, message: 'Use at least 8 characters' },
                  }}
                />

                <TextField
                  name="confirm_password"
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  rules={{
                    required: 'Type the new password again',
                    // Checked here as well as server-side so the mismatch is
                    // caught on blur rather than after a round trip.
                    validate: (value) =>
                      value === newPassword || 'The two passwords do not match',
                  }}
                />

                <p className="rounded-control bg-surface-alt px-3 py-2 text-xs text-ink-muted">
                  Changing your password signs you out everywhere, including here.
                  You will need to sign in again with the new one.
                </p>

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  isLoading={form.formState.isSubmitting}
                  loadingText="Saving…"
                >
                  {forced ? 'Set password and sign in' : 'Change password'}
                </Button>
              </form>
            </FormProvider>
          )}
        </Card>
      </div>
    </main>
  );
}
