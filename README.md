# Cardone Capital Investor Portal — local reconstruction

A runnable, provisional reconstruction of the Cardone Capital investor portal
(reference: `investors.appfolioim.com/cardonecapital/investor/opportunities`,
an AppFolio Investment Manager tenant).

> **Honesty note.** The reference opportunities page and every investor screen
> are **behind authentication**; a signed-out request redirects to the sign-in
> page. Only the **sign-in page** could be visually verified. The sign-in page
> is reproduced from measured styles; the **opportunities, offering detail,
> commitment workflow, dashboard, documents, and profile screens are a
> provisional reconstruction** with **synthetic data** and are labeled
> *unverified* in the UI and in `docs/feature-matrix.md`. No AppFolio server
> source, database, or private integrations were accessed or recovered. This is
> **not affiliated with Cardone Capital or AppFolio** and moves **no real
> funds**, collects no real identity, and produces no legally binding signature.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with design tokens measured from the reference
- **PostgreSQL** via **Prisma** (migrations committed). Runs locally with Docker
  and on serverless hosts (e.g. Vercel + a hosted Postgres like Neon).
- **Zod** validation at server boundaries
- **bcryptjs** hashing, DB-backed sessions, signed httpOnly cookie, CSRF +
  same-origin checks
- No persistent filesystem required: demo PDFs are generated on the fly and the
  email adapter logs/writes a dev message (no provider credentials needed)
- **Playwright** (e2e) + **Vitest** (unit)

## Quick start (local, Docker Postgres)

```bash
cp .env.example .env            # defaults target the docker-compose Postgres
docker compose up -d db         # Postgres 16 on :5432
npm install
npm run setup                   # prisma generate + migrate deploy + seed
npm run dev                     # http://localhost:3000
```

No Docker? Point `DATABASE_URL` in `.env` at any Postgres (local install or a
free Neon database) and run `npm run setup`.

Open `http://localhost:3000` → redirects to `/investor/opportunities` →
(signed-out) redirects to `/login`.

### Demo credentials (local only, synthetic)

| Email | Password | Notes |
| --- | --- | --- |
| `investor1@example.com` | `Demo!2345` | Positions, transactions, private docs, a seeded interest |
| `investor2@example.com` | `Demo!2345` | Minimal data — used to verify data isolation |

## Deploying (Vercel + Cloudflare DNS)

See **[DEPLOY.md](DEPLOY.md)** for exact click-by-click steps. Summary:

1. Create a free **Neon** Postgres database; copy its connection string.
2. Import this repo into **Vercel** (framework auto-detected as Next.js).
3. Set Vercel env vars: `DATABASE_URL` (Neon), `SESSION_SECRET` (random),
   `APP_URL` (your domain). The build runs migrations automatically
   (`vercel.json` → `prisma migrate deploy`).
4. Seed once: `DATABASE_URL=<neon> npm run db:seed` (from your machine).
5. Point your **Cloudflare** domain at Vercel (DNS `CNAME`/`A`), and disconnect
   the old Cloudflare Pages static deployment so it stops serving the previous
   site.

> Why not Cloudflare Pages directly? This is a dynamic Next.js app (server
> routes, Postgres, sessions). Cloudflare's static Pages hosting can't run it;
> running it on Cloudflare would require re-platforming to Workers + D1 + R2.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run setup` | generate client + apply migrations + seed |
| `npm run db:migrate` | `prisma migrate deploy` (apply migrations) |
| `npm run db:reset` | **Reset** DB, re-apply migrations, re-seed (run before e2e) |
| `npm run db:seed` | Seed synthetic data |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next lint |
| `npm run test:unit` | Vitest unit tests (money helpers) |
| `npm run test:e2e` | Playwright flows (auth, interest, isolation, downloads) |

> E2e tests mutate the DB (they submit an interest). Run `npm run db:reset`
> before re-running `npm run test:e2e`.

## Configuration

`.env` (see `.env.example`):

- `DATABASE_URL` — Postgres connection string
- `SESSION_SECRET` — HMAC key for session/reset tokens (**set a long random
  value**; `openssl rand -base64 48`)
- `APP_URL` — base URL for reset links
- `NEXT_PUBLIC_BRAND_NAME` — branding is configurable (default `CARDONE`)

## Security & integrity

- **Auth**: bcrypt hashes; DB-backed sessions (12h TTL); signed httpOnly cookie
  (HMAC, timing-safe compare); login redirect preserves `?next=` (no open
  redirect).
- **Authorization on every protected read/write**: pages and API routes resolve
  the session user server-side; document downloads re-check ownership
  (`DocumentAccess`); commitments/withdrawals are scoped to the owner — a guessed
  ID returns 404, not another investor's data.
- **CSRF**: token issued in middleware, verified on mutations; plus same-origin
  checks on the API.
- **Money**: integer cents, `dollarsToCents` rejects malformed input, totals are
  **derived from stored records** (never hardcoded). `BigInt` for fund-level
  aggregates.
- **Idempotency**: unique `(user, offering, entity)` + transactions prevent
  duplicate commitments.
- **Simulation labeling**: a persistent banner and per-step copy state that no
  funds move and no real signature/verification occurs.

## Local-only adapters (no paid providers)

- **Email** (`lib/email.ts`): no real email. Locally writes to `storage/mail/`;
  on a server, logs to the deployment logs (and OS temp). Password-reset links
  appear there.
- **Documents**: synthetic PDFs are generated on the fly at download time — no
  files on disk, so the app runs on read-only serverless filesystems.
- Integrating live email/e-sign/payments/bank/identity requires credentials you
  supply (kept server-side). A local simulation is **not** a completed
  production integration.

## Verification artifacts

Screenshots in `artifacts/` (reference vs implementation login at 1440×900, plus
opportunities/detail/dashboard/profile/documents and a 390×844 mobile view). See
`docs/reference-audit.md` and `docs/feature-matrix.md` for what is verified vs.
provisional vs. blocked.

## Raising fidelity of gated screens

The gated screens are provisional because the reference requires login. To match
them precisely, provide **authorized screenshots or a short walkthrough
recording** of the opportunities grid, an offering detail, the dashboard,
documents, and profile. Drop them in `reference/` and they can be matched at the
documented viewports. (Do not share real credentials.)
