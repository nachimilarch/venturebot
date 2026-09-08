// Tenant-facing API key management (protected by normal JWT auth)
import express from 'express';
import crypto from 'crypto';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/api-keys — list keys for the authenticated tenant
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, key_prefix, is_active, last_used, created_at
       FROM api_keys WHERE tenant_id = ? ORDER BY created_at DESC`,
      [req.user.tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/api-keys — generate a new key
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'name is required (min 2 chars)' });
    }

    // Count existing keys — cap at 10 per tenant
    const [[{ cnt }]] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM api_keys WHERE tenant_id = ?',
      [req.user.tenantId]
    );
    if (cnt >= 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 API keys per account' });
    }

    // Generate: "vb_" + 40 random hex chars
    const rawKey   = 'vb_' + crypto.randomBytes(20).toString('hex');
    const keyHash  = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 12);

    await pool.execute(
      'INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix) VALUES (?, ?, ?, ?)',
      [req.user.tenantId, name.trim(), keyHash, keyPrefix]
    );

    // Return raw key ONCE — we never store it
    res.status(201).json({
      success: true,
      message: 'Save this key now — it will not be shown again.',
      data: { name: name.trim(), key: rawKey, keyPrefix },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/api-keys/:id — revoke a key
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM api_keys WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }
    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/api-keys/:id — enable or disable a key
router.patch('/:id', async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean' && is_active !== 0 && is_active !== 1) {
      return res.status(400).json({ success: false, error: 'is_active must be true or false' });
    }
    const [result] = await pool.execute(
      'UPDATE api_keys SET is_active = ? WHERE id = ? AND tenant_id = ?',
      [is_active ? 1 : 0, req.params.id, req.user.tenantId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }
    res.json({ success: true, message: `API key ${is_active ? 'enabled' : 'disabled'}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
