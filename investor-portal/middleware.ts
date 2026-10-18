import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CSRF_COOKIE = 'cc_csrf';

// Issue a CSRF token (if absent) and forward the current pathname so server
// components can preserve the intended destination through the login redirect.
// Cookies cannot be set from a server component, so this is done here.
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set('x-pathname', req.nextUrl.pathname + req.nextUrl.search);

  let csrf = req.cookies.get(CSRF_COOKIE)?.value;
  const needCsrf = !csrf;
  if (!csrf) {
    csrf = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    // Make the new token visible to this same render.
    const existingCookie = headers.get('cookie');
    headers.set('cookie', `${existingCookie ? existingCookie + '; ' : ''}${CSRF_COOKIE}=${csrf}`);
  }

  const res = NextResponse.next({ request: { headers } });
  if (needCsrf) {
    res.cookies.set(CSRF_COOKIE, csrf, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  return res;
}

export const config = {
  matcher: ['/investor/:path*', '/login', '/forgot-password', '/reset-password'],
};
