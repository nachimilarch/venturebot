import db from '../config/database.js';

class User {
  static async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async create({ name, email, password_hash }) {
    const [res] = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, password_hash]
    );
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [res.insertId]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
  }
}

export default User;
