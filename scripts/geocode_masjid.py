#!/usr/bin/env python3
"""Geocode masjid names using Nominatim API. Cache results to avoid re-querying."""

import json
import time
import urllib.request
import urllib.parse
import sqlite3
import os

GEOCODE_CACHE_FILE = 'scripts/geocode_cache.json'

# Load cache
if os.path.exists(GEOCODE_CACHE_FILE):
    with open(GEOCODE_CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)
else:
    cache = {}

def geocode_masjid(name, district):
    """Query Nominatim for masjid coordinates. Returns (lat, lng) or (None, None)."""
    # Check cache first
    cache_key = f"{name}, {district}, Kedah, Malaysia"
    if cache_key in cache:
        return cache[cache_key]
    
    # Build query - try masjid name first
    queries = [
        f"{name}, {district}, Kedah, Malaysia",
        f"{name}, Kedah, Malaysia",
    ]
    
    for q in queries:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(q)}&limit=1&countrycodes=my"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'KuliahMapKedah/2.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if data and len(data) > 0:
                    lat = float(data[0]['lat'])
                    lng = float(data[0]['lon'])
                    cache[cache_key] = (lat, lng)
                    return (lat, lng)
        except Exception as e:
            print(f"  Error geocoding '{q}': {e}")
        time.sleep(1.1)  # Nominatim rate limit
    
    cache[cache_key] = (None, None)
    return (None, None)

def main():
    # Load parsed data
    with open('scripts/parsed_jadual.json', 'r', encoding='utf-8') as f:
        entries = json.load(f)
    
    print(f"Geocoding {len(entries)} masjid...")
    success = 0
    failed = 0
    
    for i, e in enumerate(entries):
        name = e['masjid_name']
        district = e['district']
        lat, lng = geocode_masjid(name, district)
        e['latitude'] = lat
        e['longitude'] = lng
        if lat is not None:
            success += 1
            print(f"  [{i+1}/{len(entries)}] OK  {name[:50]}... = ({lat:.4f}, {lng:.4f})")
        else:
            failed += 1
            print(f"  [{i+1}/{len(entries)}] FAIL {name[:50]}... = NOT FOUND")
    
    # Save updated entries
    with open('scripts/parsed_jadual.json', 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    
    # Save cache
    with open(GEOCODE_CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
    
    print(f"\nDone: {success} geocoded, {failed} failed")
    print(f"Cache saved to {GEOCODE_CACHE_FILE}")

if __name__ == '__main__':
    main()
