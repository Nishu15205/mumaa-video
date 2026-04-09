/**
 * MUMAA Platform - Self-hosted TURN Server
 *
 * This service provides a TURN relay for WebRTC connections.
 * It allows video calls to work across different networks (behind NATs, firewalls, etc.)
 *
 * IMPORTANT: This service needs to be deployed on a server with:
 * - Public IP address (or properly forwarded ports)
 * - UDP port 3478 open (for standard TURN)
 * - TCP port 3478 open (for TURN over TCP)
 *
 * Environment Variables:
 * - TURN_PORT: Listen port (default: 3478)
 * - TURN_REALM: Authentication realm (default: mumaa)
 * - TURN_USERNAME: TURN username (default: mumaa)
 * - TURN_PASSWORD: TURN password (default: mumaa-turn-password)
 * - TURN_EXTERNAL_IP: Public IP/domain of this server (required for production)
 *
 * Usage:
 *   bun run dev          # Development with auto-reload
 *   npm start            # Production
 *
 * To configure with the main app, set these env vars on the mumaa-web service:
 *   TURN_URL=turn:YOUR_SERVER_IP:3478,turn:YOUR_SERVER_IP:3478?transport=tcp
 *   TURN_USERNAME=mumaa
 *   TURN_CREDENTIAL=mumaa-turn-password
 */

import { createServer } from 'http';

// ─── TURN Server ─────────────────────────────────────────────────────────

const PORT = parseInt(process.env.TURN_PORT || '3478', 10);
const REALM = process.env.TURN_REALM || 'mumaa';
const USERNAME = process.env.TURN_USERNAME || 'mumaa';
const PASSWORD = process.env.TURN_PASSWORD || 'mumaa-turn-password';
const EXTERNAL_IP = process.env.TURN_EXTERNAL_IP || '';

// ─── HTTP API ────────────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  const url = req.url || '/';

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Return TURN configuration for clients
  if (req.method === 'GET' && url === '/config') {
    const config = {
      urls: [
        `turn:${EXTERNAL_IP || '<YOUR_SERVER_IP>'}:${PORT}`,
        `turn:${EXTERNAL_IP || '<YOUR_SERVER_IP>'}:${PORT}?transport=tcp`,
      ],
      username: USERNAME,
      credential: PASSWORD,
      realm: REALM,
    };
    const body = JSON.stringify(config);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
    return;
  }

  // Health check
  if (req.method === 'GET' && url === '/health') {
    const body = JSON.stringify({ status: 'ok', port: PORT, realm: REALM });
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// ─── Start ───────────────────────────────────────────────────────────────

httpServer.listen(PORT + 100, () => {
  console.log(`[TURN] HTTP config API on :${PORT + 100}`);
  console.log(`[TURN] Config endpoint: http://localhost:${PORT + 100}/config`);
});

console.log(`[TURN] TURN Server (node-turn)`);
console.log(`[TURN] Port: ${PORT}`);
console.log(`[TURN] Realm: ${REALM}`);
console.log(`[TURN] Username: ${USERNAME}`);
if (EXTERNAL_IP) {
  console.log(`[TURN] External IP: ${EXTERNAL_IP}`);
  console.log(`[TURN] TURN URLs: turn:${EXTERNAL_IP}:${PORT}, turn:${EXTERNAL_IP}:${PORT}?transport=tcp`);
} else {
  console.log(`[TURN] WARNING: No EXTERNAL_IP set!`);
  console.log(`[TURN] Set TURN_EXTERNAL_IP env var for production.`);
}
console.log(`[TURN] Ready!`);

// ─── Start node-turn server ──────────────────────────────────────────────

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Turn = require('node-turn');
  const turnServer = new Turn({
    listeningPort: PORT,
    realm: REALM,
    credentials: {
      [USERNAME]: PASSWORD,
    },
  });

  turnServer.start();
  console.log(`[TURN] TURN relay server started on port ${PORT}`);
} catch (err) {
  console.error(`[TURN] Failed to start TURN server:`, err);
  console.log(`[TURN] HTTP config API still available. TURN relay not running.`);
  console.log(`[TURN] For TURN relay, consider using 'coturn' (C-based) for better performance.`);
}
