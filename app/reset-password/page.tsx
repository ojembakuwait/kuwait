import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { prisma } from '@/lib/db';
import { hashPassword, verifyResetToken } from '@/lib/auth';

export const metadata: Metadata = { title: 'Reset Password | Cardone Capital' };

async function doReset(formData: FormData): Promise<void> {
  'use server';
  const token = String(formData.get('token') || '');
  const pw = String(formData.get('password') || '');
  const userId = verifyResetToken(token);
  if (!userId) redirect('/reset-password?error=invalid');
  if (pw.length < 8) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=short`);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(pw) } });
  redirect('/login?reset=1');
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  const token = searchParams.token || '';
  const valid = !!verifyResetToken(token);
  const err = searchParams.error;

  return (
    <main className="flex min-h-screen flex-col items-center bg-surface px-4">
      <div className="mt-24 w-full max-w-card">
        <div className="card px-8 py-8">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="mt-6 text-center text-2xl font-normal">Choose a new password</h1>

          {!valid ? (
            <p className="mt-6 text-sm text-danger" role="alert">
              This reset link is invalid or has expired.{' '}
              <a href="/forgot-password" className="link">
                Request a new one
              </a>
              .
            </p>
          ) : (
            <form action={doReset} className="mt-6">
              <input type="hidden" name="token" value={token} />
              {err === 'short' && (
                <p className="mb-3 text-sm text-danger" role="alert">
                  Password must be at least 8 characters.
                </p>
              )}
              <div className="mb-4">
                <label htmlFor="password" className="field-label">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="field-input"
                />
              </div>
              <button className="btn-primary" type="submit">
                Update password
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
