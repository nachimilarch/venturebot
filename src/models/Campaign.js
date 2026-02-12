const db = require('../config/db');

class Campaign {
  static async create({ name, template_name, template_language }) {
    const [res] = await db.query(
      'INSERT INTO campaigns (name, template_name, template_language) VALUES (?, ?, ?)',
      [name, template_name, template_language]
    );
    const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [res.insertId]);
    return rows[0];
  }

  static async setStatus(id, status) {
    await db.query('UPDATE campaigns SET status = ? WHERE id = ?', [status, id]);
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [id]);
    return rows[0];
  }
}

module.exports = Campaign;
