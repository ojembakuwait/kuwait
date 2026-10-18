# Feature matrix

Status legend: **V** = implemented & verified (test/screenshot) · **P** =
implemented, provisional (reference behind auth, fidelity unverified) · **B** =
blocked (needs access/integration).

| # | Feature | Evidence | Route / location | Expected behavior | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | Sign-in page (visual) | Reference login screenshot | `/login` · `app/login/*` | Match reference card, logo, fields, button, footer | **V** — `artifacts/login-impl-1440.png` vs `login-reference-1440.png` |
| 2 | Real local authentication | Spec | `lib/auth.ts`, `app/login/actions.ts` | bcrypt verify, DB-backed session, signed httpOnly cookie | **V** — e2e "invalid credentials", "login lands on opportunities" |
| 3 | Return-to-destination | Reference gating | `middleware.ts`, `lib/guards.ts` | Deep link while signed-out → `/login?next=…`, then returns | **V** — e2e "deep link redirects preserving destination" |
| 4 | Logout / session destroy | Spec | `PortalHeader`, `logoutAction` | Clears session; protected routes redirect after | **V** — verify.js "after logout redirects" |
| 5 | Session expiry | Spec | `lib/auth.ts` (12h TTL, expiry check) | Expired session treated as signed-out | **V** (unit of logic) — expiry branch in `getCurrentUser` |
| 6 | Password reset (local) | Reference "Forgot password?" | `/forgot-password`, `/reset-password` | Neutral response; signed, time-limited token; dev-inbox email | **V** (flow) / **P** (reference copy) |
| 7 | Opportunities listing | Reference route (gated) | `/investor/opportunities` | Cards with imagery, metrics, status, progress | **P** — `artifacts/opportunities-1440.png` |
| 8 | Search / filter / sort / tabs | Common portal controls (gated) | `OpportunitiesBrowser` | Search text, status tabs, sort by min/progress | **V** (functionality) / **P** (presence in ref) — e2e "search filters" |
| 9 | Offering states | Reference implies distinctions | seed `status` | OPEN / COMING_SOON / FULLY_SUBSCRIBED / CLOSED | **P** — visible on cards/detail |
| 10 | Offering detail | Gated | `/investor/opportunities/[slug]` | Metrics, overview, documents, interest panel | **P** — `artifacts/offering-detail-1440.png` |
| 11 | Express interest workflow | Gated | `CommitmentPanel` + `POST /api/commitments` | amount → entity → review → submit; server validates min/max & availability | **V** (logic) / **P** (step fidelity) — e2e "express interest validates & persists" |
| 12 | Server-side validation | Spec | `lib/validation.ts`, API route | Zod at boundary; min/max; entity ownership | **V** — e2e + verify.js "API rejects unknown offering" |
| 13 | Duplicate prevention | Spec | unique `(user,offering,entity)` + `$transaction` | No duplicate active commitment | **V** — unique constraint + API 409 path |
| 14 | Edit / withdraw interest | Spec ("edit or resume") | `CommitmentPanel`, `PUT`/`DELETE` | Edit amount; withdraw sets WITHDRAWN | **V** (logic) — DELETE csrf-guarded |
| 15 | Commitment states distinct | Spec | `Commitment.status` | INTEREST / COMMITTED / FUNDED / WITHDRAWN | **P** |
| 16 | Dashboard & positions | Gated | `/investor/dashboard` | Totals derived from records; positions table | **V** (derivation) / **P** (layout) — `artifacts/dashboard-1440.png` |
| 17 | Transactions + filter | Gated | `TransactionTable` | Contributions/distributions/capital-calls; type filter | **V** (filter) / **P** (fidelity) |
| 18 | Documents list | Gated | `/investor/documents` | Offering + private (tax/report) docs | **P** — `artifacts/documents-1440.png` |
| 19 | Protected download | Spec | `GET /api/documents/[id]` | Auth + per-user grant; streams real PDF | **V** — verify.js owner 200 / non-owner 404 |
| 20 | Data isolation | Spec | API scoping, `DocumentAccess` | Investor 2 cannot read Investor 1 records by URL/ID | **V** — e2e "data isolation" |
| 21 | Profile & entities | Gated | `/investor/profile` | Edit contact; add investing entities | **V** (persist) / **P** (fidelity) — `artifacts/profile-1440.png` |
| 22 | Decimal-safe money | Spec | `lib/money.ts` (integer cents) | No float drift; BigInt for fund aggregates | **V** — `tests/money.test.ts` (7 tests) |
| 23 | CSRF + same-origin | Spec | `middleware.ts`, `verifyCsrf`, `sameOrigin` | Token + origin check on mutations | **V** — verify.js "DELETE without csrf 403" |
| 24 | Local email adapter | Spec | `lib/email.ts` | Dev inbox under `storage/mail`; no provider creds | **V** (writes file) |
| 25 | Documents without persistent FS | Spec | `app/api/documents/[id]/route.ts`, `lib/pdf.ts` | Synthetic PDFs generated on the fly (serverless-safe) | **V** (download works) |
| 26 | Keyboard / a11y | Spec | global focus styles, semantic controls, `aria-*` | Visible focus, labels, menu roles | **P** (manual) |
| 27 | Not-found / refresh / history | Spec | `app/not-found.tsx`, app router | Direct nav + refresh work; 404 page | **V** — build routes + 404 |
| --- | --- | --- | --- | --- | --- |
| B1 | Exact gated-screen fidelity | — | — | Pixel match to real opportunities/detail/etc. | **B** — needs authorized screenshots/recording |
| B2 | Live email / payments / e-sign / bank / identity | — | adapters present, unconfigured | Real provider delivery | **B** — needs provider credentials (intentionally out of scope) |
