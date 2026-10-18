# Reference audit — Cardone Capital Investor Portal

**Reference URL:** `https://investors.appfolioim.com/cardonecapital/investor/opportunities`
**Audited:** 2026-10-18, via headless Chromium (Playwright) from this environment.
**Platform:** AppFolio Investment Manager (investor portal product), tenant `cardonecapital`.

## Access reality (most important finding)

The opportunities route is **behind authentication**. A direct, unauthenticated
request to `/cardonecapital/investor/opportunities` performs a client/redirect
flow and lands on:

```
/cardonecapital/investor/login   (HTTP 200, title "Log In | Cardone Capital | Investor Portal")
```

Therefore the **only investor-facing screen that can be visually verified without
credentials is the sign-in page.** The opportunities listing, offering detail,
dashboard, documents, profile, and any commitment workflow are gated and were
**not observed**. No credentials were used and no authentication bypass was
attempted (and none should be). Everything built for the gated screens is a
**provisional reconstruction** and is labeled unverified below and in the UI.

## Routes & navigation observed

| Route | Behavior | Verified |
| --- | --- | --- |
| `/cardonecapital/investor/opportunities` | Redirects to `…/investor/login` when unauthenticated | ✅ |
| `/cardonecapital/investor/login` | Renders sign-in form | ✅ |
| Investor opportunities / detail / dashboard / documents / profile | Require auth; not observed | ❌ (gated) |

A sessionStorage `uiQuery` bootstrap script re-applies query params on load. The
app is a client-rendered SPA (nonce-based CSP, HubSpot/Pendo/Intercom/FullStory/
ThreatMetrix/Plaid/reCAPTCHA integrations referenced in the CSP header).

## Sign-in page — measured design inventory (viewport 1440×900)

Screenshot: `artifacts/login-reference-1440.png` (reference) vs
`artifacts/login-impl-1440.png` (implementation).

| Token | Measured value | Source |
| --- | --- | --- |
| Body font | system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, …`) | computed style |
| Body background | `#ffffff` | computed |
| Body text | `rgb(33,37,41)` → `#212529` | computed |
| Primary button bg | `rgb(2,117,216)` → `#0275d8` | computed (Bootstrap primary) |
| Button text | `#ffffff`, 16px, radius 4px, padding ~5.6px 12px | computed |
| Input border | `1px solid rgb(206,212,218)` → `#ced4da`, radius 4px, 16px | computed |
| Input text | `rgb(73,80,87)` → `#495057` | computed |
| Label | 14.4px, `rgb(108,117,125)` → `#6c757d` | computed |
| Link color | `rgb(47,117,209)` → `#2f75d1` | computed |
| Card/form width | ~410px | bounding box |
| Logo | Navy "C" ring + "CARDONE CAPITAL®" wordmark | screenshot |

### Page structure (sign-in), visible text & controls

- Centered card: **Cardone Capital logo** → heading **"Log in to your Investor Portal"**.
- **Email** label + text input.
- **Password** label + password input.
- **"Forgot password?"** link (right-aligned).
- Primary **"Log In"** button; **"Knowledge Base ↗"** link (external).
- Footer: **"Cardone Capital"**, phone **+1 305 407 0276**, email **invest@cardonecapital.com**.
- `<meta name="robots" content="noindex, nofollow">`.

## Assets & their origin

- Favicon: `af-im-ui.s3.us-east-2.amazonaws.com/static-assets/investor-portal/…ico` (AppFolio, not copied).
- OG image / logo: AppFolio S3 (`im-prod-images`, tenant-specific; not copied).
- **No reference images are redistributed.** The implementation uses a
  reconstructed inline-SVG brand lockup (`components/Logo.tsx`) and generated
  gradient placeholders for offering hero art.

## Unknowns / assumptions / requires additional access

- **All gated screens** (opportunities grid, offering detail, commitment/interest
  workflow, dashboard, positions, contributions/distributions, documents/tax
  forms, profile/entities/banking). Layout, fields, calculations, and controls
  are **unknown**; the implementation's versions are provisional.
- Whether this tenant enables specific AppFolio modules (e-sign, Plaid bank
  linking, accreditation/identity, capital calls) — **not provable from outside.**
- To raise fidelity of gated screens, authorized screenshots or a walkthrough
  recording are required (see README "Raising fidelity").
