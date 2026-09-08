// src/routes/system.js
// Exposes the correct webhook URL to the frontend.
// In production: reads APP_BASE_URL from env.
// In development: reads ngrok's local API at 127.0.0.1:4040 if running.

import express from 'express';
const router = express.Router();

// GET /api/system/webhook-url
router.get('/webhook-url', async (req, res) => {
  try {
    const url = await resolveWebhookUrl();
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, url: null, error: err.message });
  }
});

async function resolveWebhookUrl() {
  // ── Production ────────────────────────────────────────────────────────────
  // APP_BASE_URL must be set in .env.production
  // e.g. APP_BASE_URL=https://api.vaartabot.io
  if (process.env.NODE_ENV === 'production') {
    const base = process.env.APP_BASE_URL;
    if (!base) {
      throw new Error('APP_BASE_URL is not set in environment');
    }
    return `${base}/webhook`;
  }

  // ── Development: try ngrok first ──────────────────────────────────────────
  // ngrok exposes a local REST API at http://127.0.0.1:4040/api/tunnels
  // when it is running. If it's not running, we fall back to localhost.
  try {
    const ngrokRes  = await fetch('http://127.0.0.1:4040/api/tunnels', {
      signal: AbortSignal.timeout(1500), // don't hang if ngrok isn't running
    });
    const data      = await ngrokRes.json();
    const tunnel    = data.tunnels?.find(t => t.proto === 'https');

    if (tunnel?.public_url) {
      return `${tunnel.public_url}/webhook`;
    }
  } catch {
    // ngrok not running — fall through to localhost
  }

  // ── Fallback: localhost ───────────────────────────────────────────────────
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}/webhook`;
}

export default router;