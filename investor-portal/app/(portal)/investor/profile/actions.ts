'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifyCsrf } from '@/lib/auth';
import { profileSchema } from '@/lib/validation';

export type ActionResult = { ok: boolean; message: string };

export async function updateProfile(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Your session has expired. Please sign in again.' };

  const parsed = profileSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    phone: formData.get('phone'),
    csrf: formData.get('csrf'),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Please check your input.' };
  }
  if (!verifyCsrf(parsed.data.csrf)) {
    return { ok: false, message: 'Invalid session token. Please reload the page.' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone || null,
    },
  });
  revalidatePath('/investor/profile');
  return { ok: true, message: 'Profile saved.' };
}

export async function addEntity(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: 'Your session has expired. Please sign in again.' };
  if (!verifyCsrf(String(formData.get('csrf') || ''))) {
    return { ok: false, message: 'Invalid session token. Please reload the page.' };
  }
  const name = String(formData.get('name') || '').trim();
  const type = String(formData.get('type') || 'INDIVIDUAL');
  if (name.length < 2) return { ok: false, message: 'Entity name is required.' };
  const allowed = ['INDIVIDUAL', 'JOINT', 'ENTITY', 'TRUST', 'IRA'];
  if (!allowed.includes(type)) return { ok: false, message: 'Invalid entity type.' };

  await prisma.investingEntity.create({ data: { userId: user.id, name, type } });
  revalidatePath('/investor/profile');
  return { ok: true, message: `Added ${name}.` };
}
