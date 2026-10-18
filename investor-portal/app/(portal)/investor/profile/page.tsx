import type { Metadata } from 'next';
import { requirePageUser } from '@/lib/guards';
import { ensureCsrfToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ProfileForm, AddEntityForm } from './ProfileForms';

export const metadata: Metadata = { title: 'Profile | Cardone Capital | Investor Portal' };

export default async function ProfilePage() {
  const sessionUser = await requirePageUser();
  const csrf = ensureCsrfToken();
  const [user, entities] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } }),
    prisma.investingEntity.findMany({ where: { userId: sessionUser.id }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Profile &amp; entities</h1>
        <p className="mt-1 text-sm text-muted">Manage your contact details and investing entities.</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-navy">Contact information</h2>
        <ProfileForm
          csrf={csrf}
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone ?? '',
            email: user.email,
          }}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-brand-navy">Investing entities</h2>
        {entities.length > 0 && (
          <ul className="mb-4 max-w-xl divide-y divide-line rounded border border-line">
            {entities.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{e.name}</span>
                <span className="text-xs uppercase text-muted">{e.type}</span>
              </li>
            ))}
          </ul>
        )}
        <AddEntityForm csrf={csrf} />
      </section>
    </div>
  );
}
