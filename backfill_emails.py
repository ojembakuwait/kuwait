#!/usr/bin/env python3
"""
Re-scrape restaurants that have a website but no email yet, using the
improved multi-language contact-page scraper in collect_restaurants.py.

This uses NO Google Places API quota -- it only fetches the restaurants'
own websites -- so it can be run on a day when the API quota is exhausted.

Rows that already have an email are left untouched. Nothing is fabricated:
a row keeps its blank email if the site publishes none.

Usage:
    python3 backfill_emails.py --csv restaurants_eu.csv --workers 24
"""

import argparse
import concurrent.futures
import csv
import sys

import requests

from collect_restaurants import scrape_email

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/122.0 Safari/537.36")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--workers", type=int, default=24)
    ap.add_argument("--limit", type=int, default=0,
                    help="only process the first N candidates (0 = all)")
    args = ap.parse_args()

    with open(args.csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    fieldnames = list(rows[0].keys())

    todo = [r for r in rows if r.get("website") and not r.get("email")]
    if args.limit:
        todo = todo[:args.limit]
    before = sum(1 for r in rows if r.get("email"))
    print(f"{len(rows)} rows, {before} already have emails; "
          f"retrying {len(todo)} sites with the improved scraper.")

    def work(row):
        session = requests.Session()
        session.headers.update({"User-Agent": UA})
        try:
            return row, scrape_email(row["website"], session)
        except Exception:
            return row, ""
        finally:
            session.close()

    found = 0
    done = 0
    with concurrent.futures.ThreadPoolExecutor(args.workers) as pool:
        for row, email in pool.map(work, todo):
            done += 1
            if email:
                row["email"] = email
                found += 1
            if done % 100 == 0:
                print(f"  {done}/{len(todo)} retried, {found} new emails",
                      flush=True)

    with open(args.csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    after = sum(1 for r in rows if r.get("email"))
    print(f"\nRecovered {found} additional emails.")
    print(f"{args.csv}: {before} -> {after} emails "
          f"({100 * after / max(len(rows), 1):.0f}% of {len(rows)} rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
