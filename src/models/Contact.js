import db from '../config/database.js';

class Contact {
  static async bulkInsert(contacts) {
    if (!contacts.length) return;
    const values = contacts.map(c => [
      c.name || null,
      c.phone,
      JSON.stringify(c.custom_variables || {})
    ]);
    const sql = `
      INSERT INTO contacts (name, phone, custom_variables)
      VALUES ?
    `;
    await db.query(sql, [values]);
  }

  static async getAll() {
    const [rows] = await db.query('SELECT * FROM contacts');
    return rows;
  }
}

export default Contact;
