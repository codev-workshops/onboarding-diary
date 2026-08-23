import { redirect } from 'next/navigation';

import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { getCurrentUser } from '@/src/modules/auth/current-user';

export const dynamic = 'force-dynamic';

/**
 * S-04. Deliberately outside the signed-in shell: the shell redirects here
 * while `must_change_password` is set, so the screen that clears the flag
 * cannot live inside the thing the flag blocks. The API refuses everything else
 * for this account regardless, so this is a route, not a control.
 */
export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/signed-out');
  if (!user.must_change_password) redirect('/dashboard');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="space-y-2 pb-6">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <p className="text-muted-foreground text-sm">
          {user.email} is signed in with a temporary password. Pick your own to continue.
        </p>
      </div>
      <ChangePasswordForm />
    </main>
  );
}
