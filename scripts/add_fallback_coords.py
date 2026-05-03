#!/usr/bin/env python3
"""Add fallback coordinates for ungeocoded masjid based on district centers."""

import json
import random

# Approximate district centers for Kedah
DISTRICT_CENTERS = {
    "Kota Setar": (6.1214, 100.3685),
    "Kuala Muda": (5.6430, 100.4880),
    "Kubang Pasu": (6.2680, 100.4218),
    "Kulim": (5.3650, 100.5556),
    "Pendang": (5.9917, 100.4750),
    "Pokok Sena": (6.1670, 100.5170),
    "Padang Terap": (6.2500, 100.6800),
    "Sik": (5.8200, 100.7430),
    "Baling": (5.6760, 100.9170),
    "Yan": (5.7980, 100.3770),
    "Langkawi": (6.3500, 99.8000),
    "Bandar Baharu": (5.1330, 100.5330),
}

def add_fallbacks():
    with open('scripts/parsed_jadual.json', 'r', encoding='utf-8') as f:
        entries = json.load(f)
    
    fallback_count = 0
    for e in entries:
        if e.get('latitude') is None or e.get('longitude') is None:
            district = e.get('district', 'Kulim')
            base = DISTRICT_CENTERS.get(district, (5.3650, 100.5556))
            # Add small random offset to prevent exact overlap
            # Spread +/- 0.03 degrees (~3km)
            lat = base[0] + random.uniform(-0.030, 0.030)
            lng = base[1] + random.uniform(-0.030, 0.030)
            e['latitude'] = round(lat, 6)
            e['longitude'] = round(lng, 6)
            fallback_count += 1
    
    with open('scripts/parsed_jadual.json', 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    
    print(f"Added fallback coordinates to {fallback_count} entries")
    print(f"Total entries: {len(entries)}")

if __name__ == '__main__':
    add_fallbacks()
