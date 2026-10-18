import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiUser } from '@/lib/guards';
import { makePdf } from '@/lib/pdf';

export const runtime = 'nodejs';

/**
 * Protected document download. Authorization is enforced on the server for
 * every request: OFFERING documents are available to any authenticated
 * investor; PRIVATE documents require an explicit DocumentAccess grant for the
 * requesting user. IDs are opaque cuids and ownership is checked — guessing an
 * ID does not grant access.
 *
 * The synthetic demo PDF is generated on the fly from the document record so
 * the app needs no persistent filesystem (works on serverless hosts).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { offering: true },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (doc.visibility === 'PRIVATE') {
    const grant = await prisma.documentAccess.findUnique({
      where: { documentId_userId: { documentId: doc.id, userId: user.id } },
    });
    if (!grant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const lines = [
    'SYNTHETIC DEMO DOCUMENT — generated for demonstration only.',
    `Category: ${doc.category}`,
    doc.offering ? `Offering: ${doc.offering.name}` : `Investor document`,
    doc.visibility === 'PRIVATE' ? `Private to: ${user.firstName} ${user.lastName}` : 'Visibility: all investors',
    'This file does not represent a real Cardone Capital document.',
  ];
  const buf = makePdf(doc.title, lines);

  const safeName = doc.title.replace(/[^a-z0-9._ -]/gi, '_') + '.pdf';
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Content-Length': String(buf.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
