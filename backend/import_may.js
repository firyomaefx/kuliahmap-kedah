require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, 'data', 'kuliahmap.db');
const db = new sqlite3.Database(DB_PATH);
const { RRule } = require('rrule');

const DISTRICTS = new Set(['Kota Setar','Kuala Muda','Kubang Pasu','Kulim','Langkawi','Padang Terap','Pendang','Pokok Sena','Sik','Baling','Bandar Baharu','Yan']);

const DISTRICT_MAP = {
  'langkawi':'Langkawi','changlun':'Kubang Pasu','chanlung':'Kubang Pasu',
  'bukitkayuhitam':'Kubang Pasu','jitra':'Kubang Pasu','kepalabatas':'Kubang Pasu',
  'ayerhitam':'Bandar Baharu','padangterap':'Padang Terap','pokoksena':'Pokok Sena',
  'alorstar':'Kota Setar','pendang':'Pendang','yan':'Yan','gurun':'Kuala Muda',
  'sungaipetani':'Kuala Muda','kulim':'Kulim','baling':'Baling','sik':'Sik',
  'kualanerang':'Padang Terap',
};

function normalizeName(s) { return s.replace(/[^a-z]/g, ''); }

function parseEntries(rawText, recurrenceDay) {
  const entries = [];
  let district = 'Kulim';
  let current = null; // { masjid, ustaz, topics:[] }

  function flush() {
    if (!current || !current.ustaz) { current = null; return; }
    const masjid = current.masjid.replace(/^\d+[\.\:\)\s]+/, '').trim();
    const allTopics = current.topics.join(' ').toLowerCase();
    const hasMaghrib = allTopics.includes('maghrib');
    const hasIsyak = allTopics.includes('isyak');

    if (hasMaghrib && hasIsyak) {
      const mt = current.topics.find(t => t.toLowerCase().includes('maghrib'));
      const it = current.topics.find(t => t.toLowerCase().includes('isyak'));
      if (mt) entries.push({ district, masjid_name: masjid, ustaz_name: current.ustaz, description: mt.replace(/lps\s*maghrib|lepas\s*maghrib/gi,'').replace(/["\~]*/g,'').trim()||mt, time_start: '19:15', recurrence_day: recurrenceDay });
      if (it) entries.push({ district, masjid_name: masjid, ustaz_name: current.ustaz, description: it.replace(/lps\s*isyak|lepas\s*isyak/gi,'').replace(/["\~]*/g,'').trim()||it, time_start: '20:30', recurrence_day: recurrenceDay });
    } else if (hasIsyak && !hasMaghrib) {
      entries.push({ district, masjid_name: masjid, ustaz_name: current.ustaz, description: current.topics.join(' / ').trim()||null, time_start: '20:30', recurrence_day: recurrenceDay });
    } else {
      entries.push({ district, masjid_name: masjid, ustaz_name: current.ustaz, description: current.topics.join(' / ').trim()||null, time_start: '19:15', recurrence_day: recurrenceDay });
    }
    current = null;
  }

  for (const rawLine of rawText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.length < 3) continue;
    // Skip boilerplate
    if (/^[\u{1F1F5}\u{1F1F8}\u{2665}\u25CF\u2666\u2022●♦•]/.test(line) && line.length < 30) continue;
    if (/HR\.|Barangsiapa|NOTED|Sebarang|kuliah adalah|blh tonton|www\.|penerangan/i.test(line)) continue;

    // District header detection
    const norm = normalizeName(line.toLowerCase());
    if (DISTRICT_MAP[norm]) { flush(); district = DISTRICT_MAP[norm]; continue; }
    // Try matching by first word
    const firstWord = line.split(/[\s\:\-]/)[0].toLowerCase();
    const normFirst = normalizeName(firstWord);
    if (DISTRICT_MAP[normFirst]) { flush(); district = DISTRICT_MAP[normFirst]; continue; }
    // Strip bullet prefix and retry
    const noBullet = line.replace(/^[●♦•\s]+/, '').toLowerCase();
    const normNoBullet = normalizeName(noBullet);
    if (DISTRICT_MAP[normNoBullet]) { flush(); district = DISTRICT_MAP[normNoBullet]; continue; }

    // Try multi-word matching
    for (const [k, v] of Object.entries(DISTRICT_MAP)) {
      if (norm.startsWith(k) && k.length >= 4) { flush(); district = v; break; }
      if (normNoBullet.startsWith(k) && k.length >= 4) { flush(); district = v; break; }
    }

    // New entry: "N: something" or "N something"
    if (/^\d+\s*[\.\:\)]\s+/.test(line)) {
      flush();
      const rest = line.replace(/^\d+\s*[\.\:\)]\s+/, '').trim();
      const starPos = rest.indexOf('*');
      if (starPos >= 0) {
        current = { masjid: rest.slice(0, starPos).trim(), ustaz: rest.slice(starPos+1).trim(), topics: [] };
      } else {
        current = { masjid: rest, ustaz: null, topics: [] };
      }
      continue;
    }

    // Ustaz line: *ustaz name
    if (line.startsWith('*') && current) {
      current.ustaz = line.slice(1).trim();
      continue;
    }

    // Topic line: ~topic
    if (line.startsWith('~') && current) {
      current.topics.push(line.slice(1).trim());
      continue;
    }

    // Legacy continuation: just text after star without ~ (might be ustaz continuation or topic)
    if (current && line.startsWith('-')) {
      current.topics.push(line.slice(1).trim());
      continue;
    }
  }
  flush();

  // Remove duplicates
  const seen = new Set();
  return entries.filter(e => {
    const key = `${e.masjid_name.toLowerCase().trim()}||${e.recurrence_day}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function insertEntries(entries, label) {
  return new Promise(resolve => {
    let ins = 0, fail = 0, done = 0;
    const total = entries.length;
    if (total === 0) return resolve({ ins: 0, fail: 0 });

    db.serialize(() => {
      entries.forEach(e => {
        const title = (e.description || 'Kuliah Maghrib').slice(0, 80).trim().replace(/[~]/g, '');
        const masjidName = e.masjid_name.replace(/^\d+[\.\:\)\s]+/, '').trim();

        db.get('SELECT id FROM masjid WHERE name = ?', [masjidName], (err, row) => {
          function doInsert(masjidId) {
            db.run(
              `INSERT INTO kuliah (masjid_id,title,ustaz_name,description,kuliah_type,date,time_start,time_end,recurrence,recurrence_day,contact_phone,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
              [masjidId, title, e.ustaz_name, e.description, 'kuliah_maghrib', null, e.time_start, null, 'weekly', e.recurrence_day, null, 'approved'],
              function(er) {
                if (er) { fail++; console.log(`  FAIL [${label}]: ${masjidName} - ${er.message}`); }
                else ins++;
                done++;
                if (done === total) resolve({ ins, fail });
              }
            );
          }

          if (err || !row) {
            db.run('INSERT INTO masjid (name,address,district,latitude,longitude,type) VALUES (?,?,?,?,?,?)',
              [masjidName, '', e.district, 0, 0, 'masjid'],
              function(er2) {
                if (er2) { fail++; console.log(`  FAIL masjid [${label}]: ${masjidName}`); done++; if (done === total) resolve({ ins, fail }); }
                else doInsert(this.lastID);
              }
            );
          } else {
            doInsert(row.id);
          }
        });
      });
    });
  });
}

// ===== SPECIAL SESSIONS =====
const SPECIAL_SESSIONS = [
  { day: 'monday', masjid_name: 'Surau Madrasah An-Nur, Kg Juara Tua, Jln Datuk Kumbar', district: 'Kota Setar', ustaz_name: 'Tuan Guru Shukri Majid', title: 'Sairus Salikin Jld 1/2', time_start: '19:15', description: 'Lepas Maghrib' },
  { day: 'monday', masjid_name: 'Surau Madrasah An-Nur, Kg Juara Tua, Jln Datuk Kumbar', district: 'Kota Setar', ustaz_name: 'Tuan Guru Shukri Majid', title: 'Sabilal Muhtadin / Tafsir Nurul Ehsan Jld 2', time_start: '20:30', description: 'Lepas Isyak' },
  { day: 'tuesday', masjid_name: 'Surau Madrasah An-Nur, Kg Juara Tua, Jln Datuk Kumbar', district: 'Kota Setar', ustaz_name: 'Tuan Guru Shukri Majid', title: 'Pelita Penuntut', time_start: '19:15', description: 'Lepas Maghrib' },
  { day: 'tuesday', masjid_name: 'Surau Madrasah An-Nur, Kg Juara Tua, Jln Datuk Kumbar', district: 'Kota Setar', ustaz_name: 'Tuan Guru Shukri Majid', title: 'Hikam & Aqidatun Najin', time_start: '20:30', description: 'Lepas Isyak' },
];

function insertSpecial(entries) {
  return new Promise(resolve => {
    let ins = 0, fail = 0, done = 0;
    const total = entries.length;
    if (total === 0) return resolve({ ins: 0, fail: 0 });

    entries.forEach(e => {
      const masjidName = e.masjid_name;
      db.get('SELECT id FROM masjid WHERE name = ?', [masjidName], (err, row) => {
        function doInsert(masjidId) {
          db.run(
            `INSERT INTO kuliah (masjid_id,title,ustaz_name,description,kuliah_type,date,time_start,time_end,recurrence,recurrence_day,contact_phone,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [masjidId, e.title, e.ustaz_name, e.description, 'kuliah_maghrib', null, e.time_start, null, 'weekly', e.day, null, 'approved'],
            function(er) { if (er) fail++; else ins++; done++; if (done === total) resolve({ ins, fail }); }
          );
        }
        if (err || !row) {
          db.run('INSERT INTO masjid (name,address,district,latitude,longitude,type) VALUES (?,?,?,?,?,?)',
            [masjidName, '', e.district, 0, 0, 'masjid'],
            function(er2) { if (er2) { fail++; done++; if (done === total) resolve({ ins, fail }); } else doInsert(this.lastID); }
          );
        } else { doInsert(row.id); }
      });
    });
  });
}

async function main() {
  console.log('=== KuliahMap Kedah — May 4-5 2026 Data Import ===\n');

  // Read from files
  const may4Path = path.join(__dirname, '..', 'scripts', 'firdaus_may4.txt');
  const may5Path = path.join(__dirname, '..', 'scripts', 'firdaus_may5.txt');

  if (!fs.existsSync(may4Path)) { console.error('Missing:', may4Path); process.exit(1); }
  if (!fs.existsSync(may5Path)) { console.error('Missing:', may5Path); process.exit(1); }

  const may4Text = fs.readFileSync(may4Path, 'utf-8');
  const may5Text = fs.readFileSync(may5Path, 'utf-8');

  console.log('May 4 text:', may4Text.length, 'chars');
  console.log('May 5 text:', may5Text.length, 'chars');

  const e4 = parseEntries(may4Text, 'monday');
  const e5 = parseEntries(may5Text, 'tuesday');
  console.log(`\nParsed: ${e4.length} Monday + ${e5.length} Tuesday = ${e4.length + e5.length} total`);

  console.log('\nImporting Monday entries...');
  const r4 = await insertEntries(e4, 'MON');
  console.log(`  Done: ${r4.ins} inserted, ${r4.fail} failed`);

  console.log('Importing Tuesday entries...');
  const r5 = await insertEntries(e5, 'TUE');
  console.log(`  Done: ${r5.ins} inserted, ${r5.fail} failed`);

  console.log('Importing special sessions...');
  const rSpec = await insertSpecial(SPECIAL_SESSIONS);
  console.log(`  Done: ${rSpec.ins} inserted, ${rSpec.fail} failed`);

  const total = r4.ins + r5.ins + rSpec.ins;
  const fails = r4.fail + r5.fail + rSpec.fail;
  console.log(`\n=== COMPLETE: ${total} inserted, ${fails} failed ===`);

  db.get("SELECT COUNT(*) as c FROM kuliah WHERE status='approved'", [], (err, row) => {
    if (!err) console.log(`DB total approved: ${row.c}`);
    db.get("SELECT COUNT(*) as c FROM masjid", [], (_, r2) => {
      if (r2) console.log(`DB total masjid: ${r2.c}`);
      db.close();
      process.exit(0);
    });
  });
}

main().catch(e => { console.error('FATAL:', e); db.close(); process.exit(1); });