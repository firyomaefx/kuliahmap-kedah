const cron = require('node-cron');
const https = require('https');
const { db } = require('./db');
const { broadcastGeocodeUpdate } = require('./websocket');

let cronJobs = [];

function start() {
  cronJobs.push(
    cron.schedule('0 */6 * * *', () => {
      geocodeZeroCoordinates();
    }, { scheduled: true })
  );

  cronJobs.push(
    cron.schedule('0 3 * * *', () => {
      cleanupStalePending();
    }, { scheduled: true })
  );

  console.log('Cron jobs started: geocode (every 6h), cleanup (daily 3am)');
}

function geocodeZeroCoordinates() {
  db.all('SELECT * FROM masjid WHERE latitude = 0 AND longitude = 0 LIMIT 5', [], (err, rows) => {
    if (err || !rows || rows.length === 0) return;

    let delay = 0;
    rows.forEach((masjid) => {
      setTimeout(() => {
        const query = `${masjid.name}, ${masjid.district}, Kedah, Malaysia`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=my`;

        https.get(url, { headers: { 'User-Agent': 'KuliahMapKedah/1.0' } }, (nRes) => {
          let data = '';
          nRes.on('data', chunk => data += chunk);
          nRes.on('end', () => {
            try {
              const results = JSON.parse(data);
              if (results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lng = parseFloat(results[0].lon);
                db.run('UPDATE masjid SET latitude = ?, longitude = ? WHERE id = ?', [lat, lng, masjid.id], (e) => {
                  if (!e) {
                    console.log(`Geocoded: ${masjid.name} → ${lat}, ${lng}`);
                    broadcastGeocodeUpdate({ id: masjid.id, name: masjid.name, latitude: lat, longitude: lng });
                  }
                });
              }
            } catch {}
          });
        }).on('error', () => {});
      }, delay);
      delay += 1200;
    });
  });
}

function cleanupStalePending() {
  db.run("DELETE FROM kuliah WHERE status = 'pending' AND created_at < datetime('now', '-30 days')", [], function(err) {
    if (!err && this.changes > 0) {
      console.log(`Cleaned ${this.changes} stale pending submissions (>30 days)`);
    }
  });
}

module.exports = { start, geocodeZeroCoordinates, cleanupStalePending };