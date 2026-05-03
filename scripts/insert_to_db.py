#!/usr/bin/env python3
"""Insert parsed jadual data into SQLite database, avoiding duplicates."""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'data', 'kuliahmap.db')

def main():
    # Load parsed data
    with open('scripts/parsed_jadual.json', 'r', encoding='utf-8') as f:
        entries = json.load(f)
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    conn.row_factory = sqlite3.Row
    
    masjid_inserted = 0
    kuliah_inserted = 0
    skipped = 0
    
    for e in entries:
        name = e['masjid_name'].strip()
        district = e.get('district', 'Kulim')
        lat = e.get('latitude', 0)
        lng = e.get('longitude', 0)
        ustaz = e.get('ustaz_name', '').strip()
        topic = e.get('topic', '').strip()
        
        # Default values
        if not topic:
            topic = "Kuliah Maghrib"
        if not ustaz:
            ustaz = "Ustaz"
        
        # Detect type from name
        mtype = "surau" if name.lower().startswith("surau") else "masjid"
        
        # Check if masjid already exists (by name)
        c.execute("SELECT id FROM masjid WHERE name LIKE ?", (f"%{name}%",))
        row = c.fetchone()
        if row:
            masjid_id = row[0]
            skipped += 1
        else:
            # Insert new masjid
            c.execute("""
                INSERT INTO masjid (name, address, district, latitude, longitude, type)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (name, "", district, lat, lng, mtype))
            masjid_id = c.lastrowid
            masjid_inserted += 1
        
        # Check if kuliah already exists for this masjid + title
        c.execute("""
            SELECT id FROM kuliah 
            WHERE masjid_id=? AND title LIKE ? AND ustaz_name LIKE ?
        """, (masjid_id, f"%{topic}%", f"%{ustaz}%"))
        if c.fetchone():
            continue  # Skip duplicate kuliah
        
        # Insert kuliah
        # Determine time based on notes or default
        time_start = "19:15"  # Default maghrib
        time_end = "20:15"
        
        # Check if topic mentions "subuh"
        if "subuh" in topic.lower() or "subuh" in ustaz.lower():
            time_start = "06:00"
            time_end = "06:45"
        
        # Check if notes mention "lps maghrib" (after maghrib)
        notes = e.get('time_notes', '')
        if "isyak" in notes.lower() or "isyak" in topic.lower():
            time_start = "20:30"
            time_end = "21:15"
        
        kuliah_type = "kuliah_maghrib"
        if "tafsir" in topic.lower():
            kuliah_type = "kuliah_maghrib"
        elif "tazkirah" in topic.lower():
            kuliah_type = "tazkirah"
        elif "sirah" in topic.lower() or "nabawi" in topic.lower():
            kuliah_type = "tazkirah"
        elif "tauhid" in topic.lower():
            kuliah_type = "kuliah_maghrib"
        elif "muslimat" in topic.lower():
            kuliah_type = "kuliah_muslimat"
        elif "ceramah" in topic.lower():
            kuliah_type = "ceramah_khas"
        
        recurrence = "weekly"
        recurrence_day = "sunday"  # Jadual dated Ahad (Sunday)
        
        c.execute("""
            INSERT INTO kuliah (masjid_id, title, ustaz_name, description, kuliah_type, date, 
                time_start, time_end, recurrence, recurrence_day, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
        """, (masjid_id, topic, ustaz, f"Kuliah mingguan di {name}", kuliah_type, None,
              time_start, time_end, recurrence, recurrence_day))
        kuliah_inserted += 1
    
    conn.commit()
    conn.close()
    
    print(f"Inserted: {masjid_inserted} new masjid, {kuliah_inserted} new kuliah")
    print(f"Skipped (already exists): {skipped} masjid")
    print(f"Total entries processed: {len(entries)}")

if __name__ == '__main__':
    main()
