import db from '../config/database.js';

class MessageLog {
  static async createQueued({ campaign_id, contact_id, phone, template_name }) {
    const [res] = await db.query(
      `INSERT INTO message_logs (campaign_id, contact_id, phone, template_name, status)
       VALUES (?, ?, ?, ?, 'queued')`,
      [campaign_id, contact_id, phone, template_name]
    );
    const [rows] = await db.query('SELECT * FROM message_logs WHERE id = ?', [res.insertId]);
    return rows[0];
  }

  static async markSent(id, whatsapp_message_id, meta_payload) {
    await db.query(
      `UPDATE message_logs
       SET status = 'sent', whatsapp_message_id = ?, meta_payload = ?
       WHERE id = ?`,
      [whatsapp_message_id, JSON.stringify(meta_payload || {}), id]
    );
  }

  static async markFailed(id, error_code, error_message, meta_payload) {
    await db.query(
      `UPDATE message_logs
       SET status = 'failed', error_code = ?, error_message = ?, meta_payload = ?
       WHERE id = ?`,
      [error_code || null, error_message || null, JSON.stringify(meta_payload || {}), id]
    );
  }

  static async updateStatusByWhatsAppId(whatsapp_message_id, status, meta_payload) {
    await db.query(
      `UPDATE message_logs
       SET status = ?, meta_payload = ?
       WHERE whatsapp_message_id = ?`,
      [status, JSON.stringify(meta_payload || {}), whatsapp_message_id]
    );
  }
}

export default MessageLog;
