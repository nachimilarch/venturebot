// routes/inbox.js — JWT-protected conversation inbox
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import pool from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import whatsappTemplateService from '../services/whatsappTemplateService.js';

const router = express.Router();
router.use(authMiddleware);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

function formatPhone(phone) {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned.startsWith('91') && cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

async function getWaConfig(tenantId) {
  const [[row]] = await pool.execute(
    'SELECT * FROM whatsapp_config WHERE tenant_id = ? AND is_active = 1 LIMIT 1',
    [tenantId]
  );
  return row || null;
}

// ─── GET /api/inbox ───────────────────────────────────────────────────────────
// Returns most-recent conversation per contact, with unread count
router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const limit    = Math.min(parseInt(req.query.limit)  || 50, 200);
    const offset   = Math.max(parseInt(req.query.offset) || 0,  0);
    const search   = req.query.search ? `%${req.query.search}%` : null;

    let where = 'WHERE ml.tenant_id = ?';
    const params = [tenantId];
    if (search) {
      where += ' AND (ml.contact_phone LIKE ? OR c.name LIKE ?)';
      params.push(search, search);
    }

    const [rows] = await pool.execute(
      `SELECT
         ml.contact_phone AS phone,
         c.name,
         c.opt_out,
         MAX(COALESCE(ml.sent_at, ml.received_at)) AS last_at,
         (SELECT message FROM message_logs
          WHERE tenant_id = ml.tenant_id AND contact_phone = ml.contact_phone
          ORDER BY COALESCE(sent_at, received_at) DESC LIMIT 1) AS last_message,
         (SELECT direction FROM message_logs
          WHERE tenant_id = ml.tenant_id AND contact_phone = ml.contact_phone
          ORDER BY COALESCE(sent_at, received_at) DESC LIMIT 1) AS last_direction,
         SUM(CASE WHEN ml.direction = 'inbound' AND ml.is_read = 0 THEN 1 ELSE 0 END) AS unread_count
       FROM message_logs ml
       LEFT JOIN contacts c ON c.tenant_id = ml.tenant_id AND c.phone = ml.contact_phone
       ${where}
       GROUP BY ml.tenant_id, ml.contact_phone, c.name, c.opt_out
       ORDER BY last_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(DISTINCT contact_phone) AS total FROM message_logs WHERE tenant_id = ?`,
      [tenantId]
    );

    res.json({ success: true, data: rows, total });
  } catch (err) {
    console.error('[inbox/list]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/inbox/unread-count ──────────────────────────────────────────────
router.get('/unread-count', async (req, res) => {
  try {
    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM message_logs
       WHERE tenant_id = ? AND direction = 'inbound' AND is_read = 0`,
      [req.user.tenantId]
    );
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/inbox/media/:mediaId ────────────────────────────────────────────
// Proxy media binary from WhatsApp (requires tenant access_token)
router.get('/media/:mediaId', async (req, res) => {
  try {
    const waConfig = await getWaConfig(req.user.tenantId);
    if (!waConfig) return res.status(400).json({ success: false, error: 'WhatsApp not configured' });

    const urlRes = await whatsappTemplateService.getMediaUrl(req.params.mediaId, waConfig);
    if (!urlRes.success) return res.status(404).json({ success: false, error: urlRes.error });

    const mediaRes = await axios.get(urlRes.url, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${waConfig.access_token}` },
    });

    res.setHeader('Content-Type', urlRes.mime_type || mediaRes.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(mediaRes.data);
  } catch (err) {
    console.error('[inbox/media]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/inbox/upload-media ─────────────────────────────────────────────
// Upload a file from the agent's browser to WhatsApp; returns media_id
router.post('/upload-media', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const waConfig = await getWaConfig(req.user.tenantId);
    if (!waConfig) return res.status(400).json({ success: false, error: 'WhatsApp not configured' });

    const result = await whatsappTemplateService.uploadMedia(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      waConfig
    );

    if (!result.success) return res.status(422).json({ success: false, error: result.error });

    res.json({ success: true, media_id: result.media_id, mime_type: req.file.mimetype, filename: req.file.originalname });
  } catch (err) {
    console.error('[inbox/upload-media]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/inbox/:phone/reply-media ──────────────────────────────────────
// Send an image or document to a contact
// body: { type: 'image'|'document', media_id?: string, url?: string, caption?: string, filename?: string }
router.post('/:phone/reply-media', async (req, res) => {
  try {
    const { type, media_id, url: mediaUrl, caption, filename } = req.body;
    if (!type || !['image', 'document'].includes(type)) {
      return res.status(400).json({ success: false, error: 'type must be image or document' });
    }
    if (!media_id && !mediaUrl) {
      return res.status(400).json({ success: false, error: 'media_id or url is required' });
    }

    const tenantId = req.user.tenantId;
    const phone    = formatPhone(req.params.phone);

    const waConfig = await getWaConfig(tenantId);
    if (!waConfig) return res.status(400).json({ success: false, error: 'WhatsApp not configured' });

    const source = media_id ? { id: media_id } : { link: mediaUrl };
    const result = await whatsappTemplateService.sendMediaMessage(phone, type, source, caption || '', filename || '', waConfig);

    if (!result.success) return res.status(422).json({ success: false, error: result.error });

    const displayMsg = caption || (type === 'document' ? `📄 ${filename || 'Document'}` : '🖼️ Image');
    const [log] = await pool.execute(
      `INSERT INTO message_logs
       (tenant_id, contact_phone, message, status, direction, is_read, sent_at, message_id,
        media_type, media_caption, media_filename)
       VALUES (?, ?, ?, 'sent', 'outbound', 1, NOW(), ?, ?, ?, ?)`,
      [tenantId, phone, displayMsg, result.messageId || null,
       type === 'image' ? 'image/jpeg' : 'application/pdf', caption || null, filename || null]
    ).catch(async () => {
      // Fallback without media columns (pre-migration)
      return pool.execute(
        `INSERT INTO message_logs
         (tenant_id, contact_phone, message, status, direction, is_read, sent_at, message_id)
         VALUES (?, ?, ?, 'sent', 'outbound', 1, NOW(), ?)`,
        [tenantId, phone, displayMsg, result.messageId || null]
      );
    });

    pool.execute(
      'UPDATE contacts SET last_message_at = NOW() WHERE tenant_id = ? AND phone = ?',
      [tenantId, phone]
    ).catch(() => {});

    res.json({
      success: true,
      data: {
        id: log.insertId,
        message: displayMsg,
        direction: 'outbound',
        status: 'sent',
        media_type: type === 'image' ? 'image/jpeg' : 'application/pdf',
        media_caption: caption || null,
        media_filename: filename || null,
        sent_at: new Date().toISOString(),
        messageId: result.messageId,
      },
    });
  } catch (err) {
    console.error('[inbox/reply-media]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/inbox/:phone ────────────────────────────────────────────────────
router.get('/:phone', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const phone    = formatPhone(req.params.phone);
    const limit    = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset   = Math.max(parseInt(req.query.offset) || 0, 0);

    const [messages] = await pool.execute(
      `SELECT id, message, direction, status, is_read,
              sent_at, received_at, delivered_at, read_at, message_id,
              media_id, media_type, media_caption, media_filename
       FROM message_logs
       WHERE tenant_id = ? AND contact_phone = ?
       ORDER BY COALESCE(sent_at, received_at) DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [tenantId, phone]
    );

    const [[contact]] = await pool.execute(
      'SELECT id, name, email, tags, opt_out, notes FROM contacts WHERE tenant_id = ? AND phone = ?',
      [tenantId, phone]
    );

    res.json({ success: true, data: messages.reverse(), contact: contact || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/inbox/:phone/read ────────────────────────────────────────────
router.patch('/:phone/read', async (req, res) => {
  try {
    const phone = formatPhone(req.params.phone);
    await pool.execute(
      `UPDATE message_logs SET is_read = 1
       WHERE tenant_id = ? AND contact_phone = ? AND direction = 'inbound' AND is_read = 0`,
      [req.user.tenantId, phone]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/inbox/:phone/reply ─────────────────────────────────────────────
router.post('/:phone/reply', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }
    if (message.length > 4096) {
      return res.status(400).json({ success: false, error: 'message exceeds 4096 chars' });
    }

    const tenantId = req.user.tenantId;
    const phone    = formatPhone(req.params.phone);

    const waConfig = await getWaConfig(tenantId);
    if (!waConfig) {
      return res.status(400).json({ success: false, error: 'WhatsApp not configured' });
    }

    const result = await whatsappTemplateService.sendTextMessage(phone, message.trim(), waConfig);
    if (!result.success) {
      return res.status(422).json({ success: false, error: result.error });
    }

    const [log] = await pool.execute(
      `INSERT INTO message_logs
       (tenant_id, contact_phone, message, status, direction, is_read, sent_at, message_id)
       VALUES (?, ?, ?, 'sent', 'outbound', 1, NOW(), ?)`,
      [tenantId, phone, message.trim(), result.messageId || null]
    );

    // Update last_message_at on contact
    pool.execute(
      'UPDATE contacts SET last_message_at = NOW() WHERE tenant_id = ? AND phone = ?',
      [tenantId, phone]
    ).catch(() => {});

    res.json({
      success: true,
      data: {
        id: log.insertId,
        message: message.trim(),
        direction: 'outbound',
        status: 'sent',
        sent_at: new Date().toISOString(),
        messageId: result.messageId,
      },
    });
  } catch (err) {
    console.error('[inbox/reply]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
