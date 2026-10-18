import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

const SESSION_COOKIE = 'cc_session';
const CSRF_COOKIE = 'cc_csrf';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

function secret(): string {
  return process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
}

function sign(value: string): string {
  const mac = crypto.createHmac('sha256', secret()).update(value).digest('base64url');
  return `${value}.${mac}`;
}

function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf('.');
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret()).update(value).digest('base64url');
  // timing-safe compare
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/** Create a DB-backed session and set the signed cookie. */
export async function createSession(userId: string): Promise<void> {
  const session = await prisma.session.create({
    data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  cookies().set(SESSION_COOKIE, sign(session.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const id = unsign(raw);
  if (id) {
    await prisma.session.deleteMany({ where: { id } });
  }
  cookies().delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenant: string;
};

/** Returns the signed-in user or null. Also clears expired sessions. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const id = unsign(raw);
  if (!id) return null;
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }
  const u = session.user;
  return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, tenant: u.tenant };
}

/**
 * CSRF token read helper. The token cookie is issued by middleware (cookies
 * cannot be set from a server component). Server components read it here to
 * embed in forms; the API handlers verify it with verifyCsrf.
 */
export function ensureCsrfToken(): string {
  return cookies().get(CSRF_COOKIE)?.value ?? '';
}

/** Stateless, signed, time-limited password-reset token (no extra table). */
export function makeResetToken(userId: string, ttlMs = 1000 * 60 * 30): string {
  const payload = `${userId}:${Date.now() + ttlMs}`;
  return Buffer.from(sign(payload)).toString('base64url');
}

export function verifyResetToken(token: string | undefined): string | null {
  if (!token) return null;
  let signed: string;
  try {
    signed = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const payload = unsign(signed);
  if (!payload) return null;
  const [userId, expStr] = payload.split(':');
  if (!userId || !expStr) return null;
  if (Number(expStr) < Date.now()) return null;
  return userId;
}

export function verifyCsrf(submitted: string | null): boolean {
  const token = cookies().get(CSRF_COOKIE)?.value;
  if (!token || !submitted) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(submitted);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
