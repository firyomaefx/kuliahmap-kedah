const { WebSocketServer } = require('ws');
const http = require('http');

let wss = null;
const clients = new Set();

function init(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => { clients.delete(ws); });

    ws.send(JSON.stringify({ type: 'connected', message: 'KuliahMap Kedah live feed' }));
  });

  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { clients.delete(ws); return ws.terminate(); }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log(`WebSocket server ready on /ws (${clients.size} clients)`);
}

function broadcast(event, data) {
  if (!wss) return;
  const payload = JSON.stringify({ type: event, data, timestamp: new Date().toISOString() });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(payload);
  });
}

function broadcastKuliahUpdate(action, kuliah) {
  broadcast('kuliah_update', { action, kuliah });
}

function broadcastNewSubmission(kuliah) {
  broadcast('new_submission', { kuliah });
}

function broadcastGeocodeUpdate(masjid) {
  broadcast('geocode_update', { masjid });
}

module.exports = { init, broadcast, broadcastKuliahUpdate, broadcastNewSubmission, broadcastGeocodeUpdate };