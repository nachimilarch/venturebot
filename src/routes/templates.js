// src/routes/templates.js — JWT-protected WhatsApp template management
import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import whatsappTemplateService from '../services/whatsappTemplateService.js';

const router = express.Router();
router.use(authMiddleware);

async function getWaConfig(tenantId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
    [tenantId]
  );
  if (!row) throw { status: 400, message: 'WhatsApp not configured. Go to Settings → WhatsApp.' };
  return row;
}

// ─── GET /api/templates ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const waConfig = await getWaConfig(req.user.tenantId);
    const result = await whatsappTemplateService.getAllTemplates(waConfig);
    if (!result.success) return res.status(502).json({ success: false, error: result.error });

    let templates = result.data;
    if (req.query.status)   templates = templates.filter(t => t.status   === req.query.status.toUpperCase());
    if (req.query.category) templates = templates.filter(t => t.category === req.query.category.toUpperCase());

    res.json({ success: true, data: templates, total: templates.length });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/templates ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, category, language, components } = req.body;

    if (!name || !category || !language || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'name, category, language, and components[] are required',
      });
    }

    const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
    if (!validCategories.includes(category.toUpperCase())) {
      return res.status(400).json({ success: false, error: `category must be one of: ${validCategories.join(', ')}` });
    }

    const waConfig = await getWaConfig(req.user.tenantId);
    const result = await whatsappTemplateService.createTemplate(
      name, category.toUpperCase(), language, components, waConfig
    );

    if (!result.success) return res.status(422).json({ success: false, error: result.error, details: result.details });

    res.status(201).json({
      success: true,
      data: {
        templateId: result.templateId,
        name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        category: category.toUpperCase(),
        language,
        status: result.status || 'PENDING',
        note: 'Template submitted for Meta review. Approval typically takes a few minutes to 24 hours.',
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/templates/:name/send ──────────────────────────────────────────
// body: { to, language?, variables? }
router.post('/:name/send', async (req, res) => {
  try {
    const { to, language = 'en', variables = [] } = req.body;
    if (!to) return res.status(400).json({ success: false, error: 'to (phone number) is required' });

    const waConfig = await getWaConfig(req.user.tenantId);
    const result = await whatsappTemplateService.sendTemplateMessage(
      to, req.params.name, language, variables, waConfig
    );

    if (!result.success) return res.status(422).json({ success: false, error: result.error });

    // Log to message_logs
    const displayMsg = `[Template: ${req.params.name}]`;
    await pool.execute(
      `INSERT INTO message_logs
       (tenant_id, contact_phone, message, status, direction, is_read, sent_at, message_id)
       VALUES (?, ?, ?, 'sent', 'outbound', 1, NOW(), ?)`,
      [req.user.tenantId, to.replace(/[^0-9]/g, ''), displayMsg, result.messageId || null]
    ).catch(() => {});

    res.json({ success: true, messageId: result.messageId });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

export default router;
