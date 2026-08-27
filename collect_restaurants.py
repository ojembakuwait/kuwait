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
import json
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
    "places.addressComponents",
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
    # Sydney upscale suburbs
    "Surry Hills", "Potts Point", "Darlinghurst", "Woollahra", "Double Bay",
    "Barangaroo", "The Rocks", "Chippendale", "Bondi", "Paddington NSW",
    # Melbourne upscale suburbs
    "South Yarra", "Fitzroy", "Carlton", "Richmond Victoria", "St Kilda",
    "Prahran", "Southbank", "Collingwood", "Brighton Victoria",
    # Brisbane / Perth / Adelaide / Gold Coast suburbs
    "Fortitude Valley", "South Brisbane", "New Farm", "Northbridge WA",
    "Cottesloe", "Subiaco", "North Adelaide", "Broadbeach", "Burleigh Heads",
    # Wine regions & resort towns
    "Hunter Valley", "McLaren Vale", "Swan Valley", "Daylesford",
    "Airlie Beach", "Palm Cove", "Noosa", "Coffs Harbour", "Port Macquarie",
]

# Europe: the top 15 countries by nominal GDP, with their major cities.
# Ordered by GDP so the largest food markets are searched first — if the
# daily quota caps a run, the highest-value countries are already done.
CITIES_EU_BY_COUNTRY = collections.OrderedDict([
    ("Germany", [
        "Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart",
        "Dusseldorf", "Leipzig", "Dresden", "Nuremberg", "Hannover",
        "Bremen", "Essen", "Dortmund", "Mannheim", "Karlsruhe", "Bonn",
        "Munster", "Wiesbaden", "Freiburg", "Heidelberg", "Baden-Baden",
    ]),
    ("United Kingdom", [
        "London", "Manchester", "Birmingham", "Edinburgh", "Glasgow",
        "Liverpool", "Leeds", "Bristol", "Oxford", "Cambridge", "Brighton",
        "Bath", "York", "Newcastle upon Tyne", "Nottingham", "Sheffield",
        "Cardiff", "Belfast", "Aberdeen", "Chester", "Canterbury",
    ]),
    ("France", [
        "Paris", "Lyon", "Marseille", "Bordeaux", "Nice", "Toulouse",
        "Nantes", "Strasbourg", "Lille", "Montpellier", "Cannes",
        "Reims", "Rennes", "Aix-en-Provence", "Dijon", "Avignon",
        "Biarritz", "Saint-Tropez", "Annecy", "Colmar",
    ]),
    ("Italy", [
        "Rome", "Milan", "Florence", "Naples", "Turin", "Venice", "Bologna",
        "Verona", "Genoa", "Palermo", "Bari", "Catania", "Parma", "Modena",
        "Siena", "Perugia", "Rimini", "Como", "Amalfi", "Sorrento",
    ]),
    ("Spain", [
        "Madrid", "Barcelona", "Valencia", "Seville", "Bilbao", "Malaga",
        "San Sebastian", "Granada", "Zaragoza", "Palma de Mallorca",
        "Alicante", "Cordoba", "Marbella", "Santiago de Compostela",
        "Valladolid", "Ibiza", "Tenerife", "Las Palmas",
    ]),
    ("Netherlands", [
        "Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven",
        "Groningen", "Maastricht", "Haarlem", "Leiden", "Delft",
        "Breda", "Tilburg", "Nijmegen", "Arnhem",
    ]),
    ("Switzerland", [
        "Zurich", "Geneva", "Basel", "Bern", "Lausanne", "Lucerne",
        "St. Moritz", "Zermatt", "Lugano", "Montreux", "Interlaken",
        "Winterthur", "St. Gallen",
    ]),
    ("Poland", [
        "Warsaw", "Krakow", "Wroclaw", "Gdansk", "Poznan", "Lodz",
        "Katowice", "Szczecin", "Lublin", "Bydgoszcz", "Sopot", "Torun",
    ]),
    ("Belgium", [
        "Brussels", "Antwerp", "Ghent", "Bruges", "Liege", "Leuven",
        "Namur", "Mechelen", "Knokke-Heist", "Ostend",
    ]),
    ("Sweden", [
        "Stockholm", "Gothenburg", "Malmo", "Uppsala", "Lund", "Helsingborg",
        "Linkoping", "Vasteras", "Orebro", "Umea",
    ]),
    ("Ireland", [
        "Dublin", "Cork", "Galway", "Limerick", "Kilkenny", "Waterford",
        "Killarney", "Kinsale", "Belfast City Centre",
    ]),
    ("Austria", [
        "Vienna", "Salzburg", "Innsbruck", "Graz", "Linz", "Klagenfurt",
        "Kitzbuhel", "Bregenz", "Villach",
    ]),
    ("Norway", [
        "Oslo", "Bergen", "Trondheim", "Stavanger", "Tromso",
        "Kristiansand", "Drammen", "Alesund",
    ]),
    ("Denmark", [
        "Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg",
        "Roskilde", "Helsingor", "Kolding",
    ]),
    ("Romania", [
        "Bucharest", "Cluj-Napoca", "Timisoara", "Iasi", "Brasov",
        "Constanta", "Sibiu", "Oradea", "Craiova", "Galati",
    ]),
])

CITIES_EU = [f"{city}, {country}"
             for country, cities in CITIES_EU_BY_COUNTRY.items()
             for city in cities]

# Europe covers BOTH fine dining and casual restaurants, so the query set is
# broader than the upscale-only US/AU lists.
QUERIES_EU = [
    "fine dining restaurant in {city}",
    "restaurant in {city}",
    "bistro in {city}",
    "trattoria or brasserie in {city}",
    "popular local restaurant in {city}",
    "cafe restaurant in {city}",
    "steakhouse in {city}",
    "seafood restaurant in {city}",
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
    "degustation restaurant in {city}, Australia",
    "chef hatted restaurant in {city}, Australia",
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


def parse_city_state_us(addr, place=None):
    state = (US_STATE_RE.search(addr or "") or [None, ""])
    state = state.group(1) if hasattr(state, "group") else ""
    m = US_CITY_RE.search(addr or "")
    return (m.group(1).strip() if m else ""), state


def parse_city_state_au(addr, place=None):
    addr = addr or ""
    ms = AU_STATE_RE.search(addr)
    state = ms.group(1) if ms else ""
    mc = AU_CITY_RE.search(addr)
    return (mc.group(1).strip() if mc else ""), state


def parse_city_country_eu(addr, place=None):
    """European addresses have no single format, so use the API's structured
    addressComponents: locality -> city, country -> the 'state' column.
    Falls back to the formatted address if components are absent."""
    city = country = ""
    for comp in (place or {}).get("addressComponents", []) or []:
        types = comp.get("types", []) or []
        text = comp.get("longText") or comp.get("shortText") or ""
        if "country" in types:
            country = text
        elif "locality" in types and not city:
            city = text
        elif "postal_town" in types and not city:  # common in the UK
            city = text
    if not city:
        for comp in (place or {}).get("addressComponents", []) or []:
            if "administrative_area_level_2" in (comp.get("types") or []):
                city = comp.get("longText") or ""
                break
    if not country:
        parts = [p.strip() for p in (addr or "").split(",") if p.strip()]
        country = parts[-1] if parts else ""
    return city, country

EMAIL_RE = re.compile(
    r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"
)
# junk we never want to treat as a contact email
EMAIL_BLOCKLIST = (
    "sentry", "wixpress", "example.com", "yourdomain", "domain.com",
    "email.com", "@2x", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    "godaddy", "squarespace.com", "cloudflare",
    # Website-template placeholders that survive on live sites. These are
    # anchored on "@" so real domains that merely end in the same words are
    # kept -- "@company.com" must not match "@londonsteakhousecompany.com".
    "@mysite.com", "@company.com", "@website.com", "@emailaddress.com",
    "@yoursite", "@your-site", "@sample.com",
    # Placeholder local parts, including non-English ones: "beispiel" is
    # German for "example", "nome" Italian for "name".
    "your@email", "yourmail@", "youremail@", "beispiel@", "esempio@",
    "ejemplo@", "voorbeeld@", "przyklad@", "nome@email",
    "noreply@", "no-reply@", "donotreply@",
)


def places_text_search(api_key, query, session, status=None):
    """Yield place dicts for a text query, following up to 3 pages.

    If `status` is a dict, sets status["quota_blocked"] = True when the API
    refuses the request for quota reasons, so the caller can tell an
    exhausted city (nothing left to find) apart from one that was never
    actually searched."""
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
            if status is not None and resp.status_code in (429, 403):
                status["quota_blocked"] = True
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
    # Europe intentionally has no price filter: the brief covers fine dining
    # AND casual restaurants, so every price tier is kept.
    "eu": {
        "cities": CITIES_EU,
        "queries": QUERIES_EU,
        "parser": parse_city_country_eu,
        "upscale_only": False,
    },
}


# Contact-page paths across the languages of the 15 target countries.
# Germany/Austria legally require an "Impressum" carrying contact details,
# and the other markets have their own conventions, so an English-only
# path list misses most European sites.
CONTACT_PATHS = (
    "/contact", "/contact-us", "/contacts", "/about",           # EN
    "/impressum", "/kontakt", "/imprint",                        # DE / AT / PL / SE / NO / DK
    "/contatti", "/contattaci",                                  # IT
    "/contacto", "/contactanos",                                 # ES
    "/nous-contacter", "/mentions-legales",                      # FR
    "/over-ons", "/contactgegevens",                             # NL
    "/kontakt-oss", "/kontakta-oss",                             # NO / SE
    "/legal", "/info", "/reservations",
)

# Words that mark a link as pointing at a contact/legal page.
CONTACT_LINK_WORDS = (
    "contact", "kontakt", "impressum", "imprint", "contatti",
    "contacto", "contatto", "mentions", "legal", "about", "over-ons",
    "info", "anfahrt", "nous-contacter",
)


def _emails_from_html(html):
    """Return emails on a page, mailto: links first (most reliable)."""
    out = []
    for m in re.findall(r'mailto:([^"\'?>\s]+)', html):
        out.append(m.strip())
    for m in EMAIL_RE.findall(html):
        out.append(m.strip())
    return out


def _clean_email(raw):
    email = (raw.replace("\u200b", "").replace("\ufeff", "")
             .strip().strip("\\").rstrip(".,;:)('\"<>"))
    if not EMAIL_RE.fullmatch(email):
        return ""
    low = email.lower()
    if any(bad in low for bad in EMAIL_BLOCKLIST):
        return ""
    if low.count("@") != 1:
        return ""
    if low.rsplit(".", 1)[-1] in ("png", "jpg", "jpeg", "gif", "svg", "webp"):
        return ""
    return email


def _pick_best(found, site_host):
    """Prefer an address on the restaurant's own domain, so we don't pick up
    the web designer's or a booking platform's address from the footer."""
    cleaned = [e for e in (_clean_email(f) for f in found) if e]
    if not cleaned:
        return ""
    host = (site_host or "").lower().lstrip("www.")
    root = host.split(".")[0] if host else ""
    if root:
        for e in cleaned:
            if root in e.split("@", 1)[1].lower():
                return e
    return cleaned[0]


def scrape_email(website, session):
    """Return the best publicly-listed email from a website, or ''.

    Looks at the homepage, then follows contact/Impressum links found on it,
    then falls back to a list of localized contact paths."""
    if not website:
        return ""
    base = website.rstrip("/")
    try:
        site_host = re.sub(r"^https?://", "", base).split("/")[0]
    except Exception:
        site_host = ""

    def fetch(url):
        try:
            r = session.get(url, timeout=8, allow_redirects=True)
        except requests.RequestException:
            return ""
        if r.status_code != 200 or not r.text:
            return ""
        return unescape(r.text)

    # 1. Homepage.
    html = fetch(website)
    if html:
        best = _pick_best(_emails_from_html(html), site_host)
        if best:
            return best

    # 2. Contact-ish links discovered on the homepage.
    candidates = []
    if html:
        for href in re.findall(r'href=["\']([^"\']+)["\']', html):
            low = href.lower()
            if any(w in low for w in CONTACT_LINK_WORDS):
                if low.startswith("mailto:") or low.startswith("#"):
                    continue
                if href.startswith("http"):
                    if site_host and site_host not in href:
                        continue  # stay on the restaurant's own domain
                    candidates.append(href)
                else:
                    candidates.append(base + "/" + href.lstrip("/"))
    # De-duplicate while keeping order, and cap the crawl per site.
    seen_urls = set()
    ordered = []
    for u in candidates + [base + p for p in CONTACT_PATHS]:
        if u not in seen_urls:
            seen_urls.add(u)
            ordered.append(u)

    for url in ordered[:8]:
        page = fetch(url)
        if not page:
            continue
        best = _pick_best(_emails_from_html(page), site_host)
        if best:
            return best
        time.sleep(0.1)
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
    ap.add_argument("--covered-threshold", type=int, default=COVERED_THRESHOLD,
                    help="skip a city once existing output holds this many "
                         "rows for it (set to 1 to skip any already-searched "
                         "city and spend quota only on newly-added cities)")
    ap.add_argument("--progress-file", default="",
                    help="JSON ledger of city entries already searched. "
                         "Defaults to .progress_<region>.json next to --out.")
    ap.add_argument("--exclude-country", action="append", default=[],
                    metavar="NAME",
                    help="skip every city in this country (repeatable). "
                         "Matches the country suffix of a CITIES entry.")
    args = ap.parse_args()

    region = REGIONS[args.region]
    cities = region["cities"]
    if args.exclude_country:
        excluded = {c.strip().lower() for c in args.exclude_country}
        before = len(cities)
        cities = [c for c in cities
                  if c.rsplit(",", 1)[-1].strip().lower() not in excluded]
        print(f"Excluding {', '.join(args.exclude_country)}: "
              f"{before - len(cities)} cities dropped, {len(cities)} remain.")
    queries = region["queries"]
    parse_city_state = region["parser"]
    upscale_only = region.get("upscale_only", True)

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
        if n >= args.covered_threshold
    }

    # Ledger of city entries already searched, keyed by the exact CITIES
    # string we query with. This is what actually makes multi-day runs
    # advance: matching on the city name returned by the API does not work,
    # because Google localizes it ("Munich" comes back as "Munchen",
    # "Cologne" as "Koln"), so those cities never looked "covered" and were
    # re-searched every run, spending the whole daily quota on one country.
    progress_path = args.progress_file or os.path.join(
        os.path.dirname(os.path.abspath(args.out)),
        f".progress_{args.region}.json")
    searched = set()
    if os.path.exists(progress_path):
        try:
            with open(progress_path, encoding="utf-8") as f:
                searched = set(json.load(f).get("searched_cities", []))
            print(f"Progress ledger: {len(searched)} cities already searched.")
        except (ValueError, OSError):
            searched = set()

    def save_progress():
        tmp = progress_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump({"region": args.region,
                       "searched_cities": sorted(searched)}, f, indent=1)
        os.replace(tmp, progress_path)

    print(f"== Phase 1: discovering restaurants via Places API "
          f"(region={args.region}) ==")
    for city in cities:
        if len(seen) >= args.target:
            break
        if city in searched:
            continue  # already searched in a previous run
        city_name = city.split(",")[0].strip().lower()
        if city_name in covered_cities:
            print(f"  [skip] {city} already covered "
                  f"({covered_counts[city_name]} rows)")
            searched.add(city)
            save_progress()
            continue
        quota_blocked = False
        for q in queries:
            if len(seen) >= args.target:
                break
            query = q.format(city=city)
            n_new = 0
            status = {}
            for place in places_text_search(api_key, query, api_session,
                                            status):
                if upscale_only and place.get("priceLevel") not in UPSCALE_LEVELS:
                    continue
                pid = place.get("id")
                if not pid or pid in seen:
                    continue
                addr = place.get("formattedAddress", "")
                name = (place.get("displayName") or {}).get("text", "")
                if (name.strip().lower(), addr.strip().lower()) in existing_keys:
                    continue  # already collected in a previous run
                city_p, state_p = parse_city_state(addr, place)
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
            if status.get("quota_blocked"):
                quota_blocked = True
                break
            print(f"  [{len(seen):>4}] {query}  (+{n_new})")

        if quota_blocked:
            # Daily quota is gone. Stop instead of spinning through the rest
            # of the city list collecting thousands of rejections, and leave
            # this city unmarked so tomorrow's run picks it up properly.
            print(f"\n  !! daily quota exhausted at: {city}")
            print("     stopping; the next run resumes from here.")
            break
        searched.add(city)
        save_progress()

    print(f"\nDiscovered {len(seen)} new restaurants this run.")

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
