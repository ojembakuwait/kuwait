import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser, type SessionUser } from './auth';

/** Server-component guard: redirect to login (preserving destination). */
export async function requirePageUser(fallback = '/investor/opportunities'): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const path = headers().get('x-pathname') || fallback;
    const qs = new URLSearchParams({ next: path }).toString();
    redirect(`/login?${qs}`);
  }
  return user;
}

/** API guard: returns the user or null (caller returns 401). */
export async function requireApiUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

/** Only allow same-origin mutations (defense-in-depth with CSRF token). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) return true; // non-browser / same-origin fetch without Origin
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
