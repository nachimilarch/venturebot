// routes/onboarding.js — check tenant setup completion
import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/onboarding/status
router.get('/status', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const [[whatsappRow]] = await pool.execute(
      'SELECT id FROM whatsapp_config WHERE tenant_id = ? LIMIT 1',
      [tenantId],
    );

    const [[contactRow]] = await pool.execute(
      'SELECT id FROM contacts WHERE tenant_id = ? LIMIT 1',
      [tenantId],
    );

    const [[campaignRow]] = await pool.execute(
      "SELECT id FROM campaigns WHERE tenant_id = ? AND status != 'draft' LIMIT 1",
      [tenantId],
    );

    res.json({
      hasWhatsapp: !!whatsappRow,
      hasContacts: !!contactRow,
      hasCampaign: !!campaignRow,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
