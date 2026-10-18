import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 text-center">
      <div className="text-5xl font-bold text-brand-navy">404</div>
      <p className="mt-3 text-muted">We couldn&apos;t find that page.</p>
      <Link href="/investor/opportunities" className="btn-primary mt-6">
        Go to opportunities
      </Link>
    </main>
  );
}
