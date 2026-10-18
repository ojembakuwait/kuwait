'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createSession, destroySession, verifyPassword } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

export type LoginState = { error?: string };

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === 'string' ? next : '';
  // Only allow internal paths — never an open redirect.
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '/investor/opportunities';
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  const next = safeNext(formData.get('next'));

  if (!parsed.success) {
    return { error: 'Enter your email and password.' };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Constant-ish message: never reveal which field was wrong.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: 'The email or password you entered is incorrect.' };
  }

  await createSession(user.id);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}
