/**
 * Persistent disclosure that this is a synthetic, non-production reconstruction.
 * Required so simulated funding/signatures/verification are never mistaken for
 * the real Cardone Capital portal or for completed financial actions.
 */
export function DemoBanner() {
  return (
    <div className="w-full bg-brand-navy px-4 py-1.5 text-center text-xs text-white/90">
      Demo reconstruction — synthetic data only. Not affiliated with Cardone Capital or AppFolio.
      No real funds, signatures, or identity verification occur here.
    </div>
  );
}
