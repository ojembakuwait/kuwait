#!/usr/bin/env python3
"""
Collect upscale / fine-dining restaurants across US metros using the
Google Places API (New), then enrich each with a publicly-listed contact
email scraped from the restaurant's own website.

Output: restaurants.csv with columns
    name, address, city, state, phone, website, email,
    price_level, rating, signature_dish, unique_qualities, source

Design principles:
  * No fabricated data. Emails are only recorded if they are actually
    published on the restaurant's own website. Fields we cannot source
    (e.g. signature_dish, when unknown) are left blank rather than guessed.
  * The API key is read from the GOOGLE_PLACES_API_KEY environment
    variable and is never written to disk by this script.

Usage:
    export GOOGLE_PLACES_API_KEY=...        # your key
    python3 collect_restaurants.py --target 1200 --out restaurants.csv
"""

import argparse
import collections
import csv
import os
import re
import sys
import time
import concurrent.futures
from html import unescape

import requests

PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.priceLevel",
    "places.rating",
    "places.userRatingCount",
    "places.editorialSummary",
    "places.primaryTypeDisplayName",
    "nextPageToken",
])

# Price levels we consider "upscale / fine dining".
UPSCALE_LEVELS = {"PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"}

# US metros with meaningful fine-dining scenes.
CITIES_US = [
    "New York, NY", "Brooklyn, NY", "Los Angeles, CA", "Beverly Hills, CA",
    "Santa Monica, CA", "San Francisco, CA", "Napa, CA", "Chicago, IL",
    "Boston, MA", "Washington, DC", "Miami, FL", "Miami Beach, FL",
    "Fort Lauderdale, FL", "Palm Beach, FL", "Orlando, FL", "Tampa, FL",
    "Las Vegas, NV", "New Orleans, LA", "Seattle, WA", "Houston, TX",
    "Dallas, TX", "Austin, TX", "San Antonio, TX", "Atlanta, GA",
    "Savannah, GA", "Philadelphia, PA", "Pittsburgh, PA", "San Diego, CA",
    "Newport Beach, CA", "Denver, CO", "Aspen, CO", "Nashville, TN",
    "Memphis, TN", "Portland, OR", "Minneapolis, MN", "Phoenix, AZ",
    "Scottsdale, AZ", "Charleston, SC", "Charlotte, NC", "Raleigh, NC",
    "Sacramento, CA", "Detroit, MI", "St. Louis, MO", "Kansas City, MO",
    "Columbus, OH", "Cleveland, OH", "Cincinnati, OH", "Indianapolis, IN",
    "Salt Lake City, UT", "Honolulu, HI", "Santa Fe, NM", "Baltimore, MD",
    "Richmond, VA", "Providence, RI", "Hartford, CT", "Milwaukee, WI",
    "Louisville, KY", "Birmingham, AL", "Jacksonville, FL", "Oakland, CA",
    "San Jose, CA", "Palo Alto, CA", "Napa Valley, CA", "Sonoma, CA",
    "Greenwich, CT", "Princeton, NJ", "Bellevue, WA", "Boulder, CO",
]

# Australian cities/regions with notable fine-dining and steakhouse scenes.
CITIES_AU = [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra",
    "Gold Coast", "Hobart", "Darwin", "Cairns", "Newcastle", "Wollongong",
    "Geelong", "Sunshine Coast", "Byron Bay", "Noosa Heads",
    "Port Douglas", "Fremantle", "Ballarat", "Bendigo", "Launceston",
    "Townsville", "Margaret River", "Yarra Valley", "Mornington Peninsula",
    "Barossa Valley", "Surfers Paradise", "Manly", "Parramatta", "Cronulla",
]

# Query variants per city. Kept lean because the daily API quota is small:
# fewer queries per city => more cities covered per quota-day.
QUERIES_US = [
    "fine dining restaurant in {city}",
    "high-end steakhouse in {city}",
    "upscale restaurant in {city}",
]
QUERIES_AU = [
    "fine dining restaurant in {city}, Australia",
    "steakhouse in {city}, Australia",
    "upscale restaurant in {city}, Australia",
]

# A CITIES entry is treated as "already covered" (and skipped, to conserve
# quota) once the existing output holds at least this many rows for it.
COVERED_THRESHOLD = 15

# --- US address parsing: "... City, ST 12345, USA" ---
US_STATE_RE = re.compile(r",\s*([A-Z]{2})\s*\d{5}")
US_CITY_RE = re.compile(r"([^,]+),\s*[A-Z]{2}\s*\d{5}")

# --- AU address parsing: "... City ST 1234, Australia" ---
AU_STATE_RE = re.compile(r"\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b\s*\d{4}")
AU_CITY_RE = re.compile(
    r",\s*([^,]+?)\s+(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s*\d{4}")


def parse_city_state_us(addr):
    state = (US_STATE_RE.search(addr or "") or [None, ""])
    state = state.group(1) if hasattr(state, "group") else ""
    m = US_CITY_RE.search(addr or "")
    return (m.group(1).strip() if m else ""), state


def parse_city_state_au(addr):
    addr = addr or ""
    ms = AU_STATE_RE.search(addr)
    state = ms.group(1) if ms else ""
    mc = AU_CITY_RE.search(addr)
    return (mc.group(1).strip() if mc else ""), state

EMAIL_RE = re.compile(
    r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"
)
# junk we never want to treat as a contact email
EMAIL_BLOCKLIST = (
    "sentry", "wixpress", "example.com", "yourdomain", "domain.com",
    "email.com", "@2x", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    "godaddy", "squarespace.com", "cloudflare",
)


def places_text_search(api_key, query, session):
    """Yield place dicts for a text query, following up to 3 pages."""
    base_body = {"textQuery": query, "maxResultCount": 20}
    body = dict(base_body)
    for _page in range(3):
        try:
            resp = session.post(
                PLACES_SEARCH_URL,
                headers={
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": FIELD_MASK,
                },
                json=body,
                timeout=30,
            )
        except requests.RequestException as e:
            print(f"    ! request error: {e}", file=sys.stderr)
            return
        if resp.status_code != 200:
            print(f"    ! HTTP {resp.status_code}: {resp.text[:200]}",
                  file=sys.stderr)
            return
        data = resp.json()
        for place in data.get("places", []):
            yield place
        token = data.get("nextPageToken")
        if not token:
            return
        # Paging requests must repeat the original query params + pageToken.
        body = dict(base_body)
        body["pageToken"] = token
        time.sleep(2)  # next-page token needs a moment to become valid


# Region configuration: cities, query templates, and address parser.
REGIONS = {
    "us": {
        "cities": CITIES_US,
        "queries": QUERIES_US,
        "parser": parse_city_state_us,
    },
    "au": {
        "cities": CITIES_AU,
        "queries": QUERIES_AU,
        "parser": parse_city_state_au,
    },
}


def scrape_email(website, session):
    """Return the best publicly-listed email from a website, or ''."""
    if not website:
        return ""
    base = website.rstrip("/")
    candidates = [website]
    for path in ("/contact", "/contact-us", "/about", "/contact-us/"):
        candidates.append(base + path)
    found = []
    for url in candidates:
        try:
            r = session.get(url, timeout=8, allow_redirects=True)
        except requests.RequestException:
            continue
        if r.status_code != 200 or not r.text:
            continue
        html = unescape(r.text)
        # Prefer explicit mailto: links.
        for m in re.findall(r'mailto:([^"\'?>\s]+)', html):
            found.append(m.strip())
        for m in EMAIL_RE.findall(html):
            found.append(m.strip())
        if found:
            break  # first page that yields anything wins
        time.sleep(0.2)
    for email in found:
        email = (email.replace("​", "").replace("﻿", "")
                 .strip().strip("\\").rstrip(".,;:)('\"<>"))
        if not EMAIL_RE.fullmatch(email):
            continue
        low = email.lower()
        if any(bad in low for bad in EMAIL_BLOCKLIST):
            continue
        if low.count("@") != 1:
            continue
        return email
    return ""


def build_unique_qualities(place):
    bits = []
    summary = (place.get("editorialSummary") or {}).get("text")
    if summary:
        bits.append(summary.strip())
    ptype = (place.get("primaryTypeDisplayName") or {}).get("text")
    if ptype:
        bits.append(ptype.strip())
    rating = place.get("rating")
    count = place.get("userRatingCount")
    if rating:
        if count:
            bits.append(f"Rated {rating}/5 ({count} reviews)")
        else:
            bits.append(f"Rated {rating}/5")
    price = place.get("priceLevel", "")
    if price == "PRICE_LEVEL_VERY_EXPENSIVE":
        bits.append("Very expensive / luxury tier")
    elif price == "PRICE_LEVEL_EXPENSIVE":
        bits.append("Expensive / upscale tier")
    return " | ".join(bits)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", type=int, default=1200,
                    help="stop once this many unique upscale places are found")
    ap.add_argument("--out", default="restaurants.csv")
    ap.add_argument("--no-email", action="store_true",
                    help="skip website email scraping (faster)")
    ap.add_argument("--email-workers", type=int, default=12)
    ap.add_argument("--region", choices=sorted(REGIONS), default="us",
                    help="which country's city list/parsing to use")
    args = ap.parse_args()

    region = REGIONS[args.region]
    cities = region["cities"]
    queries = region["queries"]
    parse_city_state = region["parser"]

    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print("ERROR: set GOOGLE_PLACES_API_KEY", file=sys.stderr)
        sys.exit(1)

    api_session = requests.Session()
    seen = {}  # place_id -> record

    # Resume support: load any existing output and skip duplicates by
    # (name, address). Previously-collected rows are preserved and merged.
    existing = []
    existing_keys = set()
    if os.path.exists(args.out):
        with open(args.out, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                existing.append(row)
                existing_keys.add((row.get("name", "").strip().lower(),
                                   row.get("address", "").strip().lower()))
        print(f"Resuming: {len(existing)} rows already in {args.out}; "
              f"new unique restaurants will be appended.")

    # Cities already well-covered in prior runs: skip them so the limited
    # daily quota is spent entirely on new metros rather than re-searching
    # places we already have.
    covered_counts = collections.Counter(
        r.get("city", "").strip().lower() for r in existing)
    covered_cities = {
        city for city, n in covered_counts.items()
        if n >= COVERED_THRESHOLD
    }

    print(f"== Phase 1: discovering restaurants via Places API "
          f"(region={args.region}) ==")
    for city in cities:
        if len(seen) >= args.target:
            break
        city_name = city.split(",")[0].strip().lower()
        if city_name in covered_cities:
            print(f"  [skip] {city} already covered "
                  f"({covered_counts[city_name]} rows)")
            continue
        for q in queries:
            if len(seen) >= args.target:
                break
            query = q.format(city=city)
            n_new = 0
            for place in places_text_search(api_key, query, api_session):
                if place.get("priceLevel") not in UPSCALE_LEVELS:
                    continue
                pid = place.get("id")
                if not pid or pid in seen:
                    continue
                addr = place.get("formattedAddress", "")
                name = (place.get("displayName") or {}).get("text", "")
                if (name.strip().lower(), addr.strip().lower()) in existing_keys:
                    continue  # already collected in a previous run
                city_p, state_p = parse_city_state(addr)
                seen[pid] = {
                    "name": (place.get("displayName") or {}).get("text", ""),
                    "address": addr,
                    "city": city_p,
                    "state": state_p,
                    "phone": place.get("nationalPhoneNumber", ""),
                    "website": place.get("websiteUri", ""),
                    "email": "",
                    "price_level": place.get("priceLevel", "")
                        .replace("PRICE_LEVEL_", "").title().replace("_", " "),
                    "rating": place.get("rating", ""),
                    "signature_dish": "",  # not provided by API; left blank
                    "unique_qualities": build_unique_qualities(place),
                    "source": "Google Places API (New)",
                }
                n_new += 1
            print(f"  [{len(seen):>4}] {query}  (+{n_new})")

    print(f"\nDiscovered {len(seen)} unique upscale restaurants.")

    records = list(seen.values())

    if not args.no_email:
        print("\n== Phase 2: scraping publicly-listed emails from websites ==")
        with_site = [r for r in records if r["website"]]

        def worker(rec):
            s = requests.Session()
            s.headers.update({"User-Agent": "Mozilla/5.0 (contact-finder)"})
            rec["email"] = scrape_email(rec["website"], s)
            return rec

        done = 0
        with concurrent.futures.ThreadPoolExecutor(
                max_workers=args.email_workers) as ex:
            for _ in ex.map(worker, with_site):
                done += 1
                if done % 25 == 0:
                    got = sum(1 for r in records if r["email"])
                    print(f"  scraped {done}/{len(with_site)} sites, "
                          f"{got} emails found so far")
        got = sum(1 for r in records if r["email"])
        print(f"Found {got} publicly-listed emails.")

    fields = ["name", "address", "city", "state", "phone", "website",
              "email", "price_level", "rating", "signature_dish",
              "unique_qualities", "source"]
    all_rows = existing + records
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in all_rows:
            w.writerow({k: r.get(k, "") for k in fields})

    print(f"\nWrote {len(all_rows)} rows to {args.out} "
          f"({len(existing)} kept from prior run, {len(records)} new)")


if __name__ == "__main__":
    main()
