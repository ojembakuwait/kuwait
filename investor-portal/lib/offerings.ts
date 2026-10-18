import { prisma } from './db';

// BigInt cents → number (safe below ~$90 trillion). Keeps client components,
// which cannot serialize bigint, free of conversion concerns.
function num(v: bigint): number {
  return Number(v);
}

/**
 * Offering query helpers. "Closed/subscribed" offerings remain visible but are
 * not open for new interest — the server enforces this in the commitment flow.
 */
export async function listOfferings() {
  const rows = await prisma.offering.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  });
  return rows.map((o) => ({ ...o, totalRaise: num(o.totalRaise), amountRaised: num(o.amountRaised) }));
}

export async function getOfferingBySlug(slug: string) {
  const o = await prisma.offering.findUnique({
    where: { slug },
    include: { documents: { where: { visibility: 'OFFERING' }, orderBy: { title: 'asc' } } },
  });
  if (!o) return null;
  return { ...o, totalRaise: num(o.totalRaise), amountRaised: num(o.amountRaised) };
}

/** A user's commitment for a given offering (any entity), if present. */
export async function userCommitmentsForOffering(userId: string, offeringId: string) {
  return prisma.commitment.findMany({
    where: { userId, offeringId },
    include: { entity: true },
  });
}

export function isOpenForInterest(status: string): boolean {
  return status === 'OPEN' || status === 'COMING_SOON';
}
