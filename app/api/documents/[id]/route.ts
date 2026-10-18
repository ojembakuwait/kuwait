import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiUser } from '@/lib/guards';
import { storage } from '@/lib/storage';

/**
 * Protected document download. Authorization is enforced on the server for
 * every request: OFFERING documents are available to any authenticated
 * investor; PRIVATE documents require an explicit DocumentAccess grant for the
 * requesting user. IDs are opaque cuids and ownership is checked — guessing an
 * ID does not grant access.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (doc.visibility === 'PRIVATE') {
    const grant = await prisma.documentAccess.findUnique({
      where: { documentId_userId: { documentId: doc.id, userId: user.id } },
    });
    if (!grant) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!storage.exists(doc.filename)) {
    return NextResponse.json({ error: 'File missing' }, { status: 410 });
  }

  const buf = storage.read(doc.filename);
  const safeName = doc.title.replace(/[^a-z0-9._ -]/gi, '_') + '.pdf';
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Content-Length': String(buf.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
