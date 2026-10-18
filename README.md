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

- **Next.js 14** (App Router) + **TypeScript** — routes & server logic
- **Tailwind CSS** with design tokens measured from the reference
- **Prisma** ORM. **Default DB is SQLite** for a zero-dependency local run; a
  **PostgreSQL** path is provided via Docker Compose (see below).
- **Zod** validation at server boundaries
- **bcryptjs** password hashing, DB-backed sessions, signed httpOnly cookie,
  CSRF token + same-origin checks
- Local **file-storage** and **email** adapters (swap for S3 / SMTP)
- **Playwright** (e2e) + **Vitest** (unit)

> Stack deviation: the spec suggests PostgreSQL as the default. SQLite is the
> committed default so `npm run setup && npm run dev` works with **no services**.
> The Postgres path is one config change away (below). Money is stored as
> integer cents; fund-level aggregates that exceed 32-bit use `BigInt`.

## Quick start (SQLite, no services)

```bash
cp .env.example .env            # defaults already target SQLite
npm install
npm run setup                   # prisma generate + db push + seed (creates ./prisma/dev.db)
npm run dev                     # http://localhost:3000
```

Open `http://localhost:3000` → redirects to `/investor/opportunities` →
(signed-out) redirects to `/login`.

### Demo credentials (local only, synthetic)

| Email | Password | Notes |
| --- | --- | --- |
| `investor1@example.com` | `Demo!2345` | Positions, transactions, private docs, a seeded interest |
| `investor2@example.com` | `Demo!2345` | Minimal data — used to verify data isolation |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run setup` | generate client + create schema + seed |
| `npm run db:reset` | **Reset** DB and re-seed (run before e2e for a clean state) |
| `npm run db:seed` | Seed synthetic data + generate demo PDFs/hero art |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next lint |
| `npm run test:unit` | Vitest unit tests (money helpers) |
| `npm run test:e2e` | Playwright flows (auth, interest, isolation, downloads) |

> E2e tests mutate the dev DB (they submit an interest). Run `npm run db:reset`
> before a fresh `npm run test:e2e` if re-running.

## PostgreSQL path (optional)

```bash
docker compose up -d db         # Postgres 16 on :5432
# in prisma/schema.prisma set: provider = "postgresql"
# in .env set DATABASE_URL="postgresql://portal:portal@localhost:5432/investor_portal?schema=public"
npm run db:reset
```

## Configuration

`.env` (see `.env.example` for all keys):

- `DATABASE_URL` — SQLite file (default) or Postgres URL
- `SESSION_SECRET` — HMAC key for session/reset tokens (**set a long random
  value**; `openssl rand -base64 48`)
- `APP_URL` — base URL for reset links
- `NEXT_PUBLIC_BRAND_NAME` — branding is configurable (default `CARDONE`)
- `STORAGE_DIR` — document + dev-mail storage (default `./storage`)

## How it works (security & integrity)

- **Auth**: bcrypt hashes; DB-backed sessions with 12h TTL; signed httpOnly
  cookie (HMAC, timing-safe compare); login redirect preserves `?next=` (no open
  redirect).
- **Authorization on every protected read/write**: pages and API routes resolve
  the session user server-side. Document downloads re-check ownership
  (`DocumentAccess`); commitments and withdrawals are scoped to the owner — a
  guessed ID returns 404, not another investor's data.
- **CSRF**: token issued in middleware, verified on mutations; plus same-origin
  checks on the API.
- **Money**: integer cents, `dollarsToCents` rejects malformed input, totals are
  **derived from stored records** (never hardcoded across pages).
- **Idempotency**: unique `(user, offering, entity)` + transactions prevent
  duplicate commitments.
- **Simulation labeling**: a persistent banner and per-step copy state that no
  funds move and no real signature/verification occurs.

## Local-only adapters (no paid providers required)

- **Email** (`lib/email.ts`): writes messages to `storage/mail/…` (a dev inbox).
  Password-reset links appear there.
- **File storage** (`lib/storage.ts`): local disk, path-traversal-safe. Swap the
  module for an S3-compatible implementation (same interface).
- No live email/payments/e-signature/bank-link/identity provider is needed to
  run. Integrating any of them requires credentials you supply (kept server-side,
  out of source control). A local simulation is **not** a completed production
  integration.

## Verification artifacts

Screenshots in `artifacts/` (reference vs implementation login at 1440×900,
plus implementation opportunities/detail/dashboard/profile/documents and a
390×844 mobile view). See `docs/reference-audit.md` and `docs/feature-matrix.md`
for what is verified vs. provisional vs. blocked.

## Raising fidelity of gated screens

The gated screens are provisional because the reference requires login. To match
them precisely, provide **authorized screenshots or a short walkthrough
recording** of the opportunities grid, an offering detail, the dashboard,
documents, and profile. Drop them in `reference/` and they can be matched at the
documented viewports. (Do not share real credentials.)

## Deployment & remaining production work

- Deployable as a standard Next.js app; set a strong `SESSION_SECRET`, a managed
  Postgres `DATABASE_URL`, and object storage behind the storage adapter.
- Remaining before any real use: real email/e-sign/payments/bank/identity
  integrations with webhook authenticity + retry-safe handling; accreditation
  flows; rate-limiting hardening; audit logging; and — critically — **verified
  reproduction of the gated screens**, which needs authorized reference access.
- Not deployed publicly.
