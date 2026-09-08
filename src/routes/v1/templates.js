import express from 'express';
import { apiKeyMiddleware } from '../../middleware/apiKeyAuth.js';
import whatsappTemplateService from '../../services/whatsappTemplateService.js';
import pool from '../../config/database.js';

const router = express.Router();
router.use(apiKeyMiddleware);

async function getWaConfig(tenantId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
    [tenantId]
  );
  if (!row) throw { status: 400, message: 'WhatsApp not configured for this account. Connect Meta in Settings.' };
  return row;
}

// ─── GET /api/v1/templates ────────────────────────────────────────────────────
// Fetch all message templates from Meta for this tenant's WABA.
// Optional query: status=APPROVED|PENDING|REJECTED, category=MARKETING|UTILITY|AUTHENTICATION
router.get('/', async (req, res) => {
  try {
    const waConfig = await getWaConfig(req.apiTenant.tenantId);
    const result = await whatsappTemplateService.getAllTemplates(waConfig);

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error });
    }

    let templates = result.data;

    if (req.query.status) {
      templates = templates.filter(t => t.status === req.query.status.toUpperCase());
    }
    if (req.query.category) {
      templates = templates.filter(t => t.category === req.query.category.toUpperCase());
    }

    res.json({ success: true, data: templates, total: templates.length });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ─── GET /api/v1/templates/sync ───────────────────────────────────────────────
// Alias for GET / — explicitly re-fetches from Meta (ignores any local cache).
router.get('/sync', async (req, res) => {
  try {
    const waConfig = await getWaConfig(req.apiTenant.tenantId);
    const result = await whatsappTemplateService.getAllTemplates(waConfig);

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data, total: result.data.length, synced_at: new Date().toISOString() });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ─── POST /api/v1/templates ───────────────────────────────────────────────────
// Submit a new template to Meta for approval.
//
// Body:
//   name        string   required  Lowercase, underscores only (e.g. "order_confirmation")
//   category    string   required  MARKETING | UTILITY | AUTHENTICATION
//   language    string   required  e.g. "en", "en_US", "hi"
//   components  array    required  Meta template components (see below)
//
// Minimal components example (text-only body):
//   [{ "type": "BODY", "text": "Hello {{1}}, your order {{2}} is confirmed." }]
//
// With header + footer:
//   [
//     { "type": "HEADER", "format": "TEXT", "text": "Order Update" },
//     { "type": "BODY",   "text": "Hi {{1}}, order {{2}} has shipped." },
//     { "type": "FOOTER", "text": "Reply STOP to opt out." }
//   ]
router.post('/', async (req, res) => {
  try {
    const { name, category, language, components } = req.body;

    if (!name || !category || !language || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'name, category, language, and components[] are required',
        example: {
          name: 'order_confirmation',
          category: 'UTILITY',
          language: 'en',
          components: [{ type: 'BODY', text: 'Hello {{1}}, your order is confirmed.' }],
        },
      });
    }

    const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
    if (!validCategories.includes(category.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `category must be one of: ${validCategories.join(', ')}`,
      });
    }

    const waConfig = await getWaConfig(req.apiTenant.tenantId);

    const result = await whatsappTemplateService.createTemplate(
      name,
      category.toUpperCase(),
      language,
      components,
      waConfig
    );

    if (!result.success) {
      return res.status(422).json({ success: false, error: result.error, details: result.details });
    }

    res.status(201).json({
      success: true,
      data: {
        templateId: result.templateId,
        name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        category: category.toUpperCase(),
        language,
        status: result.status,
        note: 'Template submitted for Meta review. Approval typically takes a few minutes to 24 hours.',
      },
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

export default router;
