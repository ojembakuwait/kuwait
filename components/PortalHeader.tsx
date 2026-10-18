'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { logoutAction } from '@/app/login/actions';

const NAV = [
  { href: '/investor/opportunities', label: 'Opportunities' },
  { href: '/investor/dashboard', label: 'Dashboard' },
  { href: '/investor/commitments', label: 'My Commitments' },
  { href: '/investor/documents', label: 'Documents' },
];

export function PortalHeader({
  user,
}: {
  user: { firstName: string; lastName: string; email: string };
}) {
  const pathname = usePathname();
  const active = NAV.find((n) => pathname.startsWith(n.href))?.href ?? '';
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const initials = (user.firstName[0] || '') + (user.lastName[0] || '');

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <a href="/investor/opportunities" aria-label="Cardone Capital home">
            <Logo className="scale-90" />
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={active === item.href ? 'page' : undefined}
                className={`rounded px-3 py-2 text-sm transition-colors ${
                  active === item.href
                    ? 'bg-canvas font-semibold text-brand-navy'
                    : 'text-ink hover:bg-canvas'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded p-2 text-ink hover:bg-canvas md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <span aria-hidden>☰</span>
          </button>

          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold uppercase text-white">
                {initials}
              </span>
              <span className="hidden sm:inline">{user.firstName}</span>
              <span aria-hidden className="text-muted">
                ▾
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-56 rounded border border-line bg-white py-1 shadow-card"
              >
                <div className="border-b border-line px-4 py-2 text-xs text-muted">
                  {user.email}
                </div>
                <a role="menuitem" href="/investor/profile" className="block px-4 py-2 text-sm hover:bg-canvas">
                  Profile &amp; entities
                </a>
                <a role="menuitem" href="/investor/documents" className="block px-4 py-2 text-sm hover:bg-canvas">
                  Documents
                </a>
                <form action={logoutAction}>
                  <button
                    role="menuitem"
                    type="submit"
                    className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-canvas"
                  >
                    Log out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {navOpen && (
        <nav className="border-t border-line bg-white px-4 py-2 md:hidden" aria-label="Primary mobile">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`block rounded px-3 py-2 text-sm ${
                active === item.href ? 'bg-canvas font-semibold text-brand-navy' : 'text-ink'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
