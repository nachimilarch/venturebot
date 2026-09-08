import express from 'express';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import whatsappTemplateService from '../services/whatsappTemplateService.js';

const router = express.Router();
router.use(authMiddleware);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(phone) {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

// ─── Helper: fetch WA config from DB ─────────────────────────────────────────

async function getWaConfig(tenantId) {
  const [rows] = await pool.execute(
    'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
    [tenantId]
  );
  return rows[0] || null;
}

// ─── GET all campaigns ────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE tenant_id = ? ORDER BY created_at DESC',
      [req.user.tenantId]
    );

    const formattedCampaigns = campaigns.map(campaign => ({
      id:               campaign.id,
      tenantId:         campaign.tenant_id,
      name:             campaign.name,
      type:             campaign.type,
      templateName:     campaign.template_name,
      templateLanguage: campaign.template_language,
      targetAudience:   campaign.target_audience,
      message:          campaign.message,
      scheduledAt:      campaign.scheduled_at,
      status:           campaign.status,
      createdAt:        campaign.created_at,
      updatedAt:        campaign.updated_at,
      messagesSent:     campaign.messages_sent,
      opens:            campaign.opens,
    }));

    res.json(formattedCampaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET single campaign ──────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  try {
    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const c = campaigns[0];
    res.json({
      id:               c.id,
      tenantId:         c.tenant_id,
      name:             c.name,
      type:             c.type,
      templateName:     c.template_name,
      templateLanguage: c.template_language,
      targetAudience:   c.target_audience,
      message:          c.message,
      scheduledAt:      c.scheduled_at,
      status:           c.status,
      createdAt:        c.created_at,
      updatedAt:        c.updated_at,
      messagesSent:     c.messages_sent,
      opens:            c.opens,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST create campaign ─────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { name, type, targetAudience, message, scheduledAt, templateName } = req.body;

    if (!name || !type || !targetAudience || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await pool.execute(
      `INSERT INTO campaigns
       (tenant_id, name, type, target_audience, message, scheduled_at,
        template_name, template_language, status, messages_sent, opens)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenantId,
        name,
        type,
        targetAudience,
        message,
        scheduledAt || null,
        templateName || null,
        templateName ? 'en' : null,
        templateName ? 'active' : 'draft',
        0,
        0,
      ]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Campaign created successfully',
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── PUT update campaign ──────────────────────────────────────────────────────

router.put('/:id', async (req, res) => {
  try {
    const { name, type, targetAudience, message, scheduledAt, status, templateName } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const fields = [];
    const values = [];

    if (name !== undefined)           { fields.push('name = ?');            values.push(name); }
    if (type !== undefined)           { fields.push('type = ?');            values.push(type); }
    if (targetAudience !== undefined) { fields.push('target_audience = ?'); values.push(targetAudience); }
    if (message !== undefined)        { fields.push('message = ?');         values.push(message); }
    if (scheduledAt !== undefined)    { fields.push('scheduled_at = ?');    values.push(scheduledAt || null); }
    if (status !== undefined)         { fields.push('status = ?');          values.push(status); }

    if (templateName !== undefined) {
      fields.push('template_name = ?');
      fields.push('template_language = ?');
      values.push(templateName || null);
      values.push(templateName ? 'en' : null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updated_at = NOW()');
    values.push(req.params.id, req.user.tenantId);

    await pool.execute(
      `UPDATE campaigns SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );

    res.json({ success: true, message: 'Campaign updated successfully' });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST submit template for approval ───────────────────────────────────────

router.post('/:id/submit-template', async (req, res) => {
  try {
    // ✅ Fetch WA config from DB
    const waConfig = await getWaConfig(req.user.tenantId);
    if (!waConfig || !waConfig.access_token) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured. Go to Settings → WhatsApp API first.',
      });
    }

    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];
    const templateName = campaign.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const components = whatsappTemplateService.buildTemplateComponents(
      campaign.message,
      'UTILITY'
    );

    // ✅ Pass waConfig as last argument
    const result = await whatsappTemplateService.createTemplate(
      templateName,
      'UTILITY',
      'en_US',
      components,
      waConfig
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Failed to create WhatsApp template',
        details: result.error,
      });
    }

    await pool.execute(
      `UPDATE campaigns 
       SET template_name = ?, template_language = ?, status = ?, updated_at = NOW() 
       WHERE id = ?`,
      [templateName, 'en', 'pending', req.params.id]
    );

    res.json({
      success: true,
      message: 'Template submitted for approval',
      templateId: result.templateId,
      status: result.status,
    });
  } catch (error) {
    console.error('Submit template error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST send campaign to all leads ─────────────────────────────────────────

router.post('/:id/send', async (req, res) => {
  try {
    // ✅ Fetch WA config from DB once at the top
    const waConfig = await getWaConfig(req.user.tenantId);
    if (!waConfig || !waConfig.access_token) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured. Go to Settings → WhatsApp API first.',
      });
    }

    const [campaigns] = await pool.execute(
      'SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    if (!campaign.template_name) {
      return res.status(400).json({
        error: 'No approved template linked to this campaign.',
      });
    }

    // ✅ Pass waConfig to getAllTemplates
    let expectedParamCount = 0;
    try {
      const tmplResult = await whatsappTemplateService.getAllTemplates(waConfig);
      if (tmplResult.success) {
        const tmpl = tmplResult.data.find(t => t.name === campaign.template_name);
        if (tmpl) {
          const body = tmpl.components?.find(c => c.type === 'BODY');
          const matches = (body?.text || '').match(/{{\d+}}/g);
          expectedParamCount = matches ? matches.length : 0;
        }
      }
    } catch (e) {
      console.warn('[Campaign Send] Could not fetch template metadata:', e.message);
    }

    // Get leads with phone numbers
    const [leads] = await pool.execute(
      'SELECT * FROM leads WHERE tenant_id = ? AND phone IS NOT NULL AND phone != ""',
      [req.user.tenantId]
    );

    if (leads.length === 0) {
      return res.status(400).json({ error: 'No leads with phone numbers found' });
    }

    // Check tenant credits
    const [tenants] = await pool.execute(
      'SELECT credits_balance FROM tenants WHERE id = ?',
      [req.user.tenantId]
    );

    if (!tenants.length || tenants[0].credits_balance < leads.length) {
      return res.status(400).json({
        error: `Insufficient credits. Required: ${leads.length}, Available: ${tenants[0]?.credits_balance || 0}`,
      });
    }

    console.log(`[Campaign Send] "${campaign.name}" → ${leads.length} leads, template vars: ${expectedParamCount}`);

    let sentCount   = 0;
    let failedCount = 0;

    for (const lead of leads) {
      try {
        const phone = formatPhone(lead.phone);

        const variableValues = expectedParamCount > 0
          ? [lead.name || 'Customer'].slice(0, expectedParamCount)
          : [];

        // ✅ Pass waConfig to sendTemplateMessage
        const result = await whatsappTemplateService.sendTemplateMessage(
          phone,
          campaign.template_name,
          campaign.template_language || 'en',
          variableValues,
          waConfig
        );

        if (result.success) {
          sentCount++;
          console.log(`✅ Sent to ${lead.name} (${phone})`);

          await pool.execute(
            `INSERT INTO message_logs 
             (tenant_id, campaign_id, contact_phone, message, status, direction, sent_at, message_id)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
            [
              req.user.tenantId,
              campaign.id,
              phone,
              `[Template: ${campaign.template_name}]`,
              'sent',
              'outbound',
              result.messageId || null,
            ]
          );
        } else {
          failedCount++;
          console.error(`❌ Failed for ${lead.name}: ${result.error}`);
        }

        // Respect WhatsApp rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        failedCount++;
        console.error(`Error sending to ${lead.name}:`, err.message);
      }
    }

    // Update campaign stats
    await pool.execute(
      `UPDATE campaigns 
       SET status = 'active', messages_sent = messages_sent + ?, updated_at = NOW()
       WHERE id = ?`,
      [sentCount, req.params.id]
    );

    // Deduct credits
    if (sentCount > 0) {
      await pool.execute(
        `UPDATE tenants 
         SET credits_balance = credits_balance - ?,
             total_messages_sent = total_messages_sent + ?
         WHERE id = ?`,
        [sentCount, sentCount, req.user.tenantId]
      );
    }

    res.json({
      success: true,
      message: 'Campaign messages sent',
      sent:    sentCount,
      failed:  failedCount,
      total:   leads.length,
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/campaigns/:id/analytics ────────────────────────────────────────
router.get('/:id/analytics', async (req, res) => {
  try {
    const [[campaign]] = await pool.execute(
      'SELECT id, name, status, messages_sent, messages_delivered, messages_read, messages_failed, created_at FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Real delivered/read counts from message_logs (updated by Meta webhook)
    const [[counts]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'sent')      AS sent,
         SUM(status = 'delivered') AS delivered,
         SUM(status = 'read')      AS read_count,
         SUM(status = 'failed')    AS failed
       FROM message_logs
       WHERE tenant_id = ? AND campaign_id = ?`,
      [req.user.tenantId, req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...campaign,
        stats: {
          total:     counts.total     || 0,
          sent:      counts.sent      || 0,
          delivered: counts.delivered || 0,
          read:      counts.read_count|| 0,
          failed:    counts.failed    || 0,
          deliveryRate: counts.total > 0
            ? ((counts.delivered / counts.total) * 100).toFixed(1)
            : '0.0',
          readRate: counts.total > 0
            ? ((counts.read_count / counts.total) * 100).toFixed(1)
            : '0.0',
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/campaigns/:id/schedule ────────────────────────────────────────
// Set or update the scheduled_at time + recipients list for a pending campaign
router.patch('/:id/schedule', async (req, res) => {
  try {
    const { scheduledAt, recipients } = req.body;
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });

    const [[existing]] = await pool.execute(
      'SELECT id, status FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });

    await pool.execute(
      `UPDATE campaigns
       SET scheduled_at = ?, recipients = ?, status = 'pending', updated_at = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [scheduledAt, recipients ? JSON.stringify(recipients) : null, req.params.id, req.user.tenantId]
    );

    res.json({ success: true, message: 'Campaign scheduled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE campaign ──────────────────────────────────────────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM campaigns WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;