import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/guards';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'Documents | Cardone Capital | Investor Portal' };

export default async function DocumentsPage() {
  const user = await requirePageUser();

  // Offering documents visible to all investors + private documents explicitly
  // granted to this user. Access is re-checked on download server-side.
  const [offeringDocs, privateDocs] = await Promise.all([
    prisma.document.findMany({
      where: { visibility: 'OFFERING' },
      include: { offering: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.document.findMany({
      where: { visibility: 'PRIVATE', access: { some: { userId: user.id } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const Section = ({ title, docs }: { title: string; docs: typeof offeringDocs }) => (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No documents.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded border border-line">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-ink">{d.title}</div>
                <div className="text-xs text-muted">
                  {d.category}
                  {'offering' in d && (d as any).offering ? ` · ${(d as any).offering.name}` : ''} ·{' '}
                  {(d.sizeBytes / 1024).toFixed(0)} KB
                </div>
              </div>
              <a className="link text-sm" href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-navy">Documents</h1>
      <p className="mt-1 text-sm text-muted">
        Offering materials and your private documents (tax forms, reports, agreements).
      </p>

      <Section title="My private documents" docs={privateDocs as typeof offeringDocs} />
      <Section title="Offering materials" docs={offeringDocs} />
    </div>
  );
}
