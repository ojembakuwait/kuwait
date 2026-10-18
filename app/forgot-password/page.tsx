import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { prisma } from '@/lib/db';
import { makeResetToken } from '@/lib/auth';
import { email } from '@/lib/email';

export const metadata: Metadata = { title: 'Forgot Password | Cardone Capital' };

async function requestReset(formData: FormData): Promise<void> {
  'use server';
  const addr = String(formData.get('email') || '')
    .trim()
    .toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: addr } });
  if (user) {
    const token = makeResetToken(user.id);
    const base = process.env.APP_URL || 'http://localhost:3000';
    await email.send({
      to: user.email,
      subject: 'Reset your Investor Portal password',
      body: `Use this link within 30 minutes to reset your password:\n${base}/reset-password?token=${token}\n\n(Development inbox — this message was written to storage/mail, not emailed.)`,
    });
  }
  // Always neutral — never disclose whether an account exists.
  redirect('/forgot-password?sent=1');
}

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { sent?: string };
}) {
  const sent = searchParams.sent === '1';
  return (
    <main className="flex min-h-screen flex-col items-center bg-surface px-4">
      <div className="mt-24 w-full max-w-card">
        <div className="card px-8 py-8">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="mt-6 text-center text-2xl font-normal">Reset your password</h1>

          {sent ? (
            <p className="mt-6 text-sm text-muted" role="status">
              If an account exists for that address, a reset link has been written to the local
              development inbox (<code>storage/mail</code>). Check it to continue.
            </p>
          ) : (
            <form action={requestReset} className="mt-6">
              <div className="mb-4">
                <label htmlFor="email" className="field-label">
                  Email
                </label>
                <input id="email" name="email" type="email" required className="field-input" />
              </div>
              <div className="flex items-center justify-between">
                <button className="btn-primary" type="submit">
                  Send reset link
                </button>
                <a href="/login" className="link text-base">
                  Back to log in
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
