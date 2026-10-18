import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { getCurrentUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Log In | Cardone Capital | Investor Portal' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  // Already signed in → go straight to the intended destination.
  const user = await getCurrentUser();
  const next =
    searchParams.next && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//')
      ? searchParams.next
      : '/investor/opportunities';
  if (user) redirect(next);

  return (
    <main className="flex min-h-screen flex-col items-center bg-surface px-4">
      <div className="mt-24 w-full max-w-card">
        <div className="card px-8 py-8">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="mt-6 text-center text-2xl font-normal text-ink">
            Log in to your Investor Portal
          </h1>
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Demo accounts are listed in the project README. This is a synthetic reconstruction —
          not the live Cardone Capital portal.
        </p>
      </div>

      <footer className="mt-16 pb-10 text-center text-sm text-muted">
        <div className="text-base text-ink">Cardone Capital</div>
        <div className="mt-1">+1 305 407 0276</div>
        <div>invest@cardonecapital.com</div>
      </footer>
    </main>
  );
}
