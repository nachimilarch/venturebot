// JWT-protected webhook subscription management (dashboard-facing)
import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const VALID_EVENTS = ['message.received', 'message.delivered', 'message.read', 'message.failed'];
const MAX_WEBHOOKS = 5;

// GET /api/webhook-subscriptions
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, url, events, is_active, failure_count, last_triggered, created_at
       FROM webhook_subscriptions WHERE tenant_id = ? ORDER BY created_at DESC`,
      [req.user.tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/webhook-subscriptions
router.post('/', async (req, res) => {
  try {
    const { name, url, events } = req.body;
    const tenantId = req.user.tenantId;

    if (!name || !url) {
      return res.status(400).json({ success: false, error: 'name and url are required' });
    }

    try { new URL(url); } catch {
      return res.status(400).json({ success: false, error: 'url must be a valid HTTPS URL' });
    }

    if (!url.startsWith('https://')) {
      return res.status(400).json({ success: false, error: 'url must use HTTPS' });
    }

    const eventList = Array.isArray(events) ? events : ['message.received'];
    const invalid = eventList.filter(e => !VALID_EVENTS.includes(e));
    if (invalid.length) {
      return res.status(400).json({ success: false, error: `Invalid events: ${invalid.join(', ')}` });
    }

    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM webhook_subscriptions WHERE tenant_id = ?',
      [tenantId]
    );
    if (count >= MAX_WEBHOOKS) {
      return res.status(400).json({ success: false, error: `Maximum ${MAX_WEBHOOKS} webhooks per account` });
    }

    const secret = crypto.randomBytes(32).toString('hex');
    const [result] = await pool.execute(
      `INSERT INTO webhook_subscriptions (tenant_id, name, url, secret, events) VALUES (?, ?, ?, ?, ?)`,
      [tenantId, name.trim(), url.trim(), secret, eventList.join(',')]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name: name.trim(),
        url: url.trim(),
        events: eventList,
        is_active: true,
        secret,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/webhook-subscriptions/:id
router.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const id = parseInt(req.params.id);
    const { url, name, events, is_active } = req.body;

    const [[sub]] = await pool.execute(
      'SELECT id FROM webhook_subscriptions WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (!sub) return res.status(404).json({ success: false, error: 'Webhook not found' });

    const updates = [];
    const params = [];

    if (url !== undefined) {
      if (!url.startsWith('https://')) return res.status(400).json({ success: false, error: 'url must use HTTPS' });
      updates.push('url = ?'); params.push(url.trim());
    }
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (events !== undefined) {
      const evList = Array.isArray(events) ? events : [events];
      updates.push('events = ?'); params.push(evList.join(','));
    }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

    if (!updates.length) return res.status(400).json({ success: false, error: 'Nothing to update' });

    await pool.execute(
      `UPDATE webhook_subscriptions SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
      [...params, id, tenantId]
    );

    res.json({ success: true, message: 'Webhook updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/webhook-subscriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM webhook_subscriptions WHERE id = ? AND tenant_id = ?',
      [parseInt(req.params.id), req.user.tenantId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Webhook not found' });
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/webhook-subscriptions/:id/test
router.post('/:id/test', async (req, res) => {
  try {
    const [[sub]] = await pool.execute(
      'SELECT id, url, secret FROM webhook_subscriptions WHERE id = ? AND tenant_id = ?',
      [parseInt(req.params.id), req.user.tenantId]
    );
    if (!sub) return res.status(404).json({ success: false, error: 'Webhook not found' });

    const payload = JSON.stringify({
      event: 'test',
      tenant_id: req.user.tenantId,
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test ping from Vaartabot.' },
    });

    const sig = 'sha256=' + crypto.createHmac('sha256', sub.secret).update(payload).digest('hex');

    try {
      const response = await axios.post(sub.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Vaartabot-Signature': sig,
          'X-Vaartabot-Event': 'test',
        },
        timeout: 10000,
      });
      res.json({
        success: true,
        data: {
          url: sub.url,
          statusCode: response.status,
          message: `Test ping delivered — your server responded ${response.status}`,
        },
      });
    } catch (err) {
      res.status(422).json({
        success: false,
        error: `Test ping failed: ${err.message}`,
        statusCode: err.response?.status ?? null,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
