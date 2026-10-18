import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiUser, sameOrigin } from '@/lib/guards';
import { verifyCsrf } from '@/lib/auth';
import { commitmentSchema } from '@/lib/validation';
import { dollarsToCents } from '@/lib/money';
import { isOpenForInterest } from '@/lib/offerings';

function bad(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Create or update an expression of interest / commitment.
 * - Server validates amount against the offering's min and remaining raise.
 * - Entity ownership is enforced (never trust a client-supplied owner).
 * - The unique (user, offering, entity) constraint + a transaction prevent
 *   duplicate commitments from double submits.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return bad(403, 'Cross-origin request rejected.');
  const user = await requireApiUser();
  if (!user) return bad(401, 'You must be signed in.');

  const body = await req.json().catch(() => null);
  const parsed = commitmentSchema.safeParse(body);
  if (!parsed.success) {
    return bad(422, parsed.error.issues[0]?.message ?? 'Invalid submission.');
  }
  if (!verifyCsrf(parsed.data.csrf)) return bad(403, 'Invalid session token. Please reload.');

  const { offeringId, entityId, note } = parsed.data;
  let amountCents: number;
  try {
    amountCents = dollarsToCents(parsed.data.amount);
  } catch {
    return bad(422, 'Enter a valid dollar amount.');
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const offering = await tx.offering.findUnique({ where: { id: offeringId } });
      if (!offering) throw { code: 404, msg: 'Offering not found.' };
      if (!isOpenForInterest(offering.status)) {
        throw { code: 409, msg: 'This offering is not currently open for new interest.' };
      }

      // Entity must belong to the signed-in user.
      const entity = await tx.investingEntity.findFirst({
        where: { id: entityId, userId: user.id },
      });
      if (!entity) throw { code: 403, msg: 'Select one of your investing entities.' };

      if (amountCents < offering.minInvestment) {
        throw {
          code: 422,
          msg: `Minimum investment is ${(offering.minInvestment / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}.`,
        };
      }
      const remaining = Number(offering.totalRaise) - Number(offering.amountRaised);
      if (amountCents > remaining) {
        throw { code: 422, msg: 'Amount exceeds the remaining allocation for this offering.' };
      }

      const existing = await tx.commitment.findUnique({
        where: { userId_offeringId_entityId: { userId: user.id, offeringId, entityId } },
      });
      if (existing && existing.status !== 'WITHDRAWN') {
        throw { code: 409, msg: 'You already have an active interest for this entity. Edit it instead.' };
      }

      const commitment = existing
        ? await tx.commitment.update({
            where: { id: existing.id },
            data: { amountCents, note: note || null, status: 'INTEREST' },
          })
        : await tx.commitment.create({
            data: {
              userId: user.id,
              offeringId,
              entityId,
              amountCents,
              note: note || null,
              status: 'INTEREST',
            },
          });
      return commitment;
    });

    return NextResponse.json({ ok: true, id: result.id, status: result.status });
  } catch (e: any) {
    if (e && typeof e.code === 'number') return bad(e.code, e.msg);
    return bad(500, 'Could not save your interest. Please try again.');
  }
}

/** Edit the amount of an existing active interest. */
export async function PUT(req: Request) {
  if (!sameOrigin(req)) return bad(403, 'Cross-origin request rejected.');
  const user = await requireApiUser();
  if (!user) return bad(401, 'You must be signed in.');
  const body = await req.json().catch(() => null);
  const parsed = commitmentSchema.safeParse(body);
  if (!parsed.success) return bad(422, parsed.error.issues[0]?.message ?? 'Invalid submission.');
  if (!verifyCsrf(parsed.data.csrf)) return bad(403, 'Invalid session token. Please reload.');

  let amountCents: number;
  try {
    amountCents = dollarsToCents(parsed.data.amount);
  } catch {
    return bad(422, 'Enter a valid dollar amount.');
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const offering = await tx.offering.findUnique({ where: { id: parsed.data.offeringId } });
      if (!offering) throw { code: 404, msg: 'Offering not found.' };
      const existing = await tx.commitment.findFirst({
        where: {
          userId: user.id,
          offeringId: parsed.data.offeringId,
          entityId: parsed.data.entityId,
          status: { not: 'WITHDRAWN' },
        },
      });
      if (!existing) throw { code: 404, msg: 'No active interest to edit.' };
      if (amountCents < offering.minInvestment)
        throw { code: 422, msg: 'Amount is below the minimum.' };
      if (amountCents > Number(offering.totalRaise) - Number(offering.amountRaised))
        throw { code: 422, msg: 'Amount exceeds the remaining allocation.' };
      return tx.commitment.update({
        where: { id: existing.id },
        data: { amountCents, note: parsed.data.note || null },
      });
    });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e: any) {
    if (e && typeof e.code === 'number') return bad(e.code, e.msg);
    return bad(500, 'Could not update your interest.');
  }
}

/** Withdraw an active interest. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return bad(403, 'Cross-origin request rejected.');
  const user = await requireApiUser();
  if (!user) return bad(401, 'You must be signed in.');
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const csrf = searchParams.get('csrf');
  if (!verifyCsrf(csrf)) return bad(403, 'Invalid session token. Please reload.');
  if (!id) return bad(422, 'Missing commitment id.');

  // Scope strictly to the owner — never withdraw another investor's record.
  const res = await prisma.commitment.updateMany({
    where: { id, userId: user.id },
    data: { status: 'WITHDRAWN' },
  });
  if (res.count === 0) return bad(404, 'Interest not found.');
  return NextResponse.json({ ok: true });
}
