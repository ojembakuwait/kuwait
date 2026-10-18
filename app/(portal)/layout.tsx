import { PortalHeader } from '@/components/PortalHeader';
import { DemoBanner } from '@/components/DemoBanner';
import { requirePageUser } from '@/lib/guards';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Any route under (portal) requires a session. Unauthenticated users are
  // redirected to /login?next=... preserving their destination.
  const user = await requirePageUser();

  return (
    <div className="min-h-screen bg-canvas">
      <DemoBanner />
      <PortalHeader user={user} />
      <div className="mx-auto max-w-shell px-4 py-8">{children}</div>
      <footer className="mx-auto max-w-shell px-4 pb-10 pt-4 text-xs text-muted">
        Cardone Capital · +1 305 407 0276 · invest@cardonecapital.com — Synthetic demo
        reconstruction. Not affiliated with Cardone Capital or AppFolio.
      </footer>
    </div>
  );
}
