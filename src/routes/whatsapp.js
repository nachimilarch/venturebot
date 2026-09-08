// src/routes/whatsapp.js
import express from 'express';
import axios from 'axios';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import whatsappTemplateService from '../services/whatsappTemplateService.js';
import {
  getWhatsAppConfig,
  clearConfigCache,
  validateMetaCredentials,
} from '../services/whatsappConfigService.js';

const router = express.Router();
router.use(authMiddleware);

function formatPhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

// ─────────────────────────────────────────────
// GET /api/whatsapp/config
// Returns tenant's WhatsApp config (NO secrets)
// ─────────────────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, phone_number_id, business_account_id, app_id,
              display_phone_number, verified_name, quality_rating,
              account_mode, api_version, is_active, is_verified, created_at
       FROM whatsapp_config WHERE tenant_id = ?`,
      [req.user.tenantId]
    );

    res.json({
      success: true,
            config: rows[0] || null,
      configured: rows.length > 0,
    });
  } catch (error) {
    console.error('[WhatsApp] Get config error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/whatsapp/config
// Save / update tenant's WhatsApp credentials
// ─────────────────────────────────────────────
router.post('/config', async (req, res) => {
  try {
    const {
      phone_number_id,
      business_account_id,
      access_token,
      app_id,
      app_secret,
      verify_token,
      api_version = 'v21.0',
    } = req.body;

    if (!phone_number_id || !business_account_id || !access_token || !verify_token) {
      return res.status(400).json({
        success: false,
        error: 'phone_number_id, business_account_id, access_token and verify_token are required',
      });
    }

    // Validate credentials against Meta API before saving
    const validation = await validateMetaCredentials(phone_number_id, access_token, api_version);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Meta API validation failed: ${validation.error}`,
      });
    }

    // Upsert — insert or update if tenant already has a config
    await pool.execute(
      `INSERT INTO whatsapp_config
        (tenant_id, phone_number_id, business_account_id, access_token,
         app_id, app_secret, verify_token, api_version,
         display_phone_number, verified_name, quality_rating, account_mode,
         is_verified, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         phone_number_id      = VALUES(phone_number_id),
         business_account_id  = VALUES(business_account_id),
         access_token         = VALUES(access_token),
         app_id               = VALUES(app_id),
         app_secret           = VALUES(app_secret),
         verify_token         = VALUES(verify_token),
         api_version          = VALUES(api_version),
         display_phone_number = VALUES(display_phone_number),
         verified_name        = VALUES(verified_name),
         quality_rating       = VALUES(quality_rating),
         account_mode         = VALUES(account_mode),
         is_verified          = 1,
         is_active            = 1,
         updated_at           = NOW()`,
      [
        req.user.tenantId,
        phone_number_id,
        business_account_id,
        access_token,
        app_id || null,
        app_secret || null,
        verify_token,
        api_version,
        validation.displayPhone || '',
        validation.verifiedName || '',
        validation.qualityRating || 'GREEN',
        validation.accountMode || 'LIVE',
      ]
    );

    // Clear cache so next request fetches fresh config
    clearConfigCache(req.user.tenantId);

    res.json({
      success: true,
      message: 'WhatsApp account connected successfully',
      phone: validation.displayPhone,
      name: validation.verifiedName,
    });
  } catch (error) {
    console.error('[WhatsApp] Save config error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/whatsapp/config
// Disconnect WhatsApp account
// ─────────────────────────────────────────────
router.delete('/config', async (req, res) => {
  try {
    await pool.execute(
      'UPDATE whatsapp_config SET is_active = 0, updated_at = NOW() WHERE tenant_id = ?',
      [req.user.tenantId]
    );
    clearConfigCache(req.user.tenantId);
    res.json({ success: true, message: 'WhatsApp account disconnected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/whatsapp/templates
// ─────────────────────────────────────────────
router.get('/templates', async (req, res) => {
  try {
    const config = await getWhatsAppConfig(req.user.tenantId);
    const result = await whatsappTemplateService.getAllTemplates(config);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    res.json({ success: true, templates: result.data });
  } catch (error) {
    console.error('[WhatsApp] Fetch templates error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/whatsapp/send-message
// ─────────────────────────────────────────────
router.post('/send-message', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ success: false, error: 'Phone number and message are required' });
    }

    const formattedPhone = formatPhone(to);

    if (formattedPhone.length < 10 || formattedPhone.length > 15) {
      return res.status(400).json({ success: false, error: `Invalid phone number: ${to}` });
    }

    // Fetch tenant's WhatsApp config from DB
    const config = await getWhatsAppConfig(req.user.tenantId);

    const result = await whatsappTemplateService.sendTextMessage(formattedPhone, message, config);

    console.log('[WhatsApp] Result:', result.success ? '✅ Sent' : `❌ Failed: ${result.error}`);

    if (result.success) {
      try {
        await pool.execute(
          `INSERT INTO message_logs
            (tenant_id, campaign_id, contact_phone, message, status, direction, sent_at, message_id)
           VALUES (?, NULL, ?, ?, 'sent', 'outbound', NOW(), ?)`,
          [req.user.tenantId, formattedPhone, message, result.messageId || null]
        );
      } catch (dbError) {
        console.error('[WhatsApp] DB log error:', dbError.message);
      }

      res.json({ success: true, messageId: result.messageId, phone: formattedPhone });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('[WhatsApp] Send error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/whatsapp/send-template
// ─────────────────────────────────────────────
router.post('/send-template', async (req, res) => {
  try {
    const { to, templateName, language, variables = {} } = req.body;

    if (!to || !templateName) {
      return res.status(400).json({ success: false, error: 'Phone number and templateName are required' });
    }

    const formattedPhone = formatPhone(to);

    // Check credits
    const [tenantRows] = await pool.execute(
      'SELECT credits_balance FROM tenants WHERE id = ?',
      [req.user.tenantId]
    );

    if (!tenantRows.length || tenantRows[0].credits_balance < 1) {
      return res.status(402).json({ success: false, error: 'Insufficient credits' });
    }

    // Fetch tenant's WhatsApp config from DB
    const config = await getWhatsAppConfig(req.user.tenantId);

    const bodyParams = Object.values(variables).map(val => String(val));

    const result = await whatsappTemplateService.sendTemplateMessage(
      formattedPhone,
      templateName,
      language || config.api_version ? 'en' : 'en',
      bodyParams,
      config
    );

    if (result.success) {
      // Deduct 1 credit
      await pool.execute(
        'UPDATE tenants SET credits_balance = credits_balance - 1 WHERE id = ?',
        [req.user.tenantId]
      );

      // Log transaction
      await pool.execute(
        `INSERT INTO transactions
          (tenant_id, type, credits, amount, status, description, created_at)
         VALUES (?, 'debit', -1, 0, 'completed', ?, NOW())`,
        [req.user.tenantId, `Message sent to ${formattedPhone} via template: ${templateName}`]
      );

      // Log message
      try {
        await pool.execute(
          `INSERT INTO message_logs
            (tenant_id, campaign_id, contact_phone, message, status, direction, sent_at, message_id)
           VALUES (?, NULL, ?, ?, 'sent', 'outbound', NOW(), ?)`,
          [req.user.tenantId, formattedPhone, `[Template: ${templateName}]`, result.messageId || null]
        );
      } catch (dbError) {
        console.error('[WhatsApp] DB log error (template):', dbError.message);
      }

      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('[WhatsApp] Template send error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/whatsapp/message-status/:messageId
// ─────────────────────────────────────────────
router.get('/message-status/:messageId', async (req, res) => {
  try {
    const [messages] = await pool.execute(
      'SELECT * FROM message_logs WHERE message_id = ? AND tenant_id = ?',
      [req.params.messageId, req.user.tenantId]
    );

    if (!messages.length) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, data: messages[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/whatsapp/message-logs
// ─────────────────────────────────────────────
router.get('/message-logs', async (req, res) => {
  try {
    const [messages] = await pool.execute(
      `SELECT * FROM message_logs
       WHERE tenant_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.tenantId]
    );

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('[WhatsApp] Get logs error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
