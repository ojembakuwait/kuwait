# Deploying the investor portal (Vercel + Cloudflare DNS)

This app is a dynamic Next.js server app (login, Postgres, sessions), so it runs
on a Node host. The recommended setup is **Vercel** for the app + **Neon** for
Postgres, with **Cloudflare** providing DNS for your domain. You do the clicks in
each dashboard; everything in this repo is already configured for it.

> Your old Cloudflare Pages deployment serves the previous static site (the
> `/cdis` page). That is a separate, static deployment. It keeps serving until
> you repoint DNS to Vercel and disconnect/delete the old Pages project (step 5).

---

## 1. Create a Postgres database (Neon — free)

1. Go to <https://neon.tech> → sign up → **Create project**.
2. Copy the **connection string** (looks like
   `postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`).
   Use the **pooled** string if offered.

(Any Postgres works — Supabase, RDS, Railway, etc. Neon is just the easiest free
option.)

## 2. Import the repo into Vercel

1. Go to <https://vercel.com> → **Add New… → Project** → import
   `ojembakuwait/kuwait`.
2. Vercel auto-detects **Next.js**. Leave the build settings as-is — `vercel.json`
   already sets the build command to run Prisma migrations:
   `prisma generate && prisma migrate deploy && next build`.
3. Pick the **production branch** to deploy (the branch that has this portal at
   its root — see step 4 / the branch your repo's default is set to).

## 3. Set environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Value |
| --- | --- |
| `DATABASE_URL` | your Neon connection string |
| `SESSION_SECRET` | a long random string (`openssl rand -base64 48`) |
| `APP_URL` | your final URL, e.g. `https://invest.yourdomain.com` |
| `NEXT_PUBLIC_BRAND_NAME` | `CARDONE` (optional) |

Then **Deploy**. The build applies the database schema automatically.

## 4. Seed the demo data once

Migrations create the tables but not the demo rows. From your machine, run once
against the production database:

```bash
# in the project folder, with the repo checked out
DATABASE_URL="<your-neon-connection-string>" npm run db:seed
```

This creates the synthetic offerings and the two demo investors
(`investor1@example.com` / `investor2@example.com`, password `Demo!2345`).
Re-running it **resets** the demo data.

## 5. Point your Cloudflare domain at Vercel

1. In Vercel → Project → **Settings → Domains**, add your domain (e.g.
   `invest.yourdomain.com`). Vercel shows the DNS target.
2. In **Cloudflare → your domain → DNS**, add the record Vercel asks for —
   usually a **CNAME** `invest` → `cname.vercel-dns.com` (proxy can be off/grey
   cloud to start). For an apex/root domain, follow Vercel's A/ALIAS instructions.
3. **Stop the old site:** in **Cloudflare → Workers & Pages**, open the old Pages
   project that builds from this repo and either **disconnect the Git
   integration** or **delete the project**, and remove any DNS record that points
   the domain at `*.pages.dev`. This is what stops the `/cdis` site from showing.

After DNS propagates, your domain serves the investor portal from Vercel.

---

## Notes & limits

- **No live providers are wired up.** Email is simulated (logged), documents are
  generated on the fly, and no payments/e-sign/identity/bank integrations run.
  Add those with your own credentials before any real use.
- **Gated reference screens remain provisional** (synthetic data, unverified
  layout) — see `README.md` and `docs/feature-matrix.md`.
- To run it on Cloudflare *instead* of Vercel, the data/auth/storage layers would
  need re-platforming to Cloudflare Workers + D1 + R2 — a separate, larger effort.
