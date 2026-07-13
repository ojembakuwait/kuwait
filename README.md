# Fine-Dining Restaurant Email Collector

Builds a CSV of upscale / fine-dining restaurants across US metros using the
**Google Places API (New)**, and enriches each with a **publicly-listed contact
email** scraped from the restaurant's own website.

## What it does

1. **Discovery** — runs several search queries ("fine dining", "upscale",
   "Michelin star", "tasting menu", "high-end steakhouse") across ~70 US
   metros, keeping only places at the *Expensive* / *Very Expensive* price
   tier. Results are de-duplicated by Google Place ID.
2. **Email enrichment** — for each restaurant with a website, fetches the
   homepage and common contact pages and records the first genuine email it
   finds published there.

## Data honesty

- **No fabricated data.** Emails are recorded only when actually published on
  the restaurant's own site. Nothing is guessed (no `info@…` pattern-filling).
- `signature_dish` is **not** available from the Places API, so it is left
  blank rather than invented. The `unique_qualities` column is filled from
  Google's editorial summary, cuisine type, rating, and price tier — all
  sourced, not made up.
- Restaurants without a public email keep an empty `email` cell.

## Output columns

`name, address, city, state, phone, website, email, price_level, rating,
signature_dish, unique_qualities, source`

## Usage

```bash
export GOOGLE_PLACES_API_KEY=your_key_here     # never commit this
python3 collect_restaurants.py --target 1400 --out restaurants.csv
```

Options:

- `--target N` — stop after N unique upscale restaurants (default 1200)
- `--no-email` — skip website scraping (much faster; leaves email blank)
- `--email-workers N` — concurrency for email scraping (default 12)

## Requirements

- Python 3.9+
- `requests` (`pip install requests`)
- A Google Cloud project with **Places API (New)** enabled and billing active,
  and an API key restricted to that API.

## Compliance note

Cold-emailing these addresses in the US is governed by CAN-SPAM: include a
valid physical mailing address and a working unsubscribe link, don't use
deceptive subject lines, and honor opt-outs promptly. This tool only collects
publicly-listed business contact addresses; you are responsible for lawful use.
