// src/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // ← None for cross-origin
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}


// ── REGISTER ──────────────────────────────────────────────────────────────────
export async function register(req, res, next) {
  const { name, email, password, businessName, industry } = req.body;

  if (!name || !email || !password || !businessName) {
    return res.status(400).json({
      success: false,
      error: 'name, email, password and businessName are required',
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[existing]] = await conn.execute(
      'SELECT id FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    if (existing) {
      await conn.rollback();
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const [tenantResult] = await conn.execute(
      `INSERT INTO tenants (name, industry, credits_balance, total_messages_sent)
       VALUES (?, ?, 0, 0)`,
      [businessName.trim(), industry?.trim() || null]
    );
    const tenantId = tenantResult.insertId;

    const passwordHash = await bcrypt.hash(password, 12);

    const [userResult] = await conn.execute(
      `INSERT INTO users (tenant_id, name, email, password_hash, role, status)
       VALUES (?, ?, ?, ?, 'admin', 'active')`,
      [tenantId, name.trim(), email.trim().toLowerCase(), passwordHash]
    );
    const userId = userResult.insertId;

    await conn.commit();

    const token = signToken({
      id: userId,
      email: email.trim().toLowerCase(),
      tenant_id: tenantId,
      role: 'admin',
      is_superadmin: false,
    });

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        tenant_id: tenantId,
        role: 'admin',
        is_superadmin: false,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('[Auth:Register]', err.message);
    next(err);
  } finally {
    conn.release();
  }
}


// ── LOGIN ─────────────────────────────────────────────────────────────────────
export async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }

  try {
    const [[user]] = await pool.execute(
      `SELECT u.id, u.tenant_id, u.name, u.email, u.password_hash,
              u.role, u.status, u.is_superadmin,
              t.subscription_status
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    const invalidErr = { success: false, error: 'Invalid email or password' };
    if (!user) return res.status(401).json(invalidErr);

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json(invalidErr);

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Account is disabled' });
    }

    const isSuperAdmin = user.is_superadmin === 1 || user.role === 'superadmin';

    // Superadmins are allowed without a tenant_id
    if (!user.tenant_id && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Account not linked to a tenant. Please contact support.',
      });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      tenant_id: user.tenant_id ?? null,
      role: user.role,
      is_superadmin: isSuperAdmin,
    });

    setAuthCookie(res, token);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenant_id: user.tenant_id ?? null,
        role: user.role,
        is_superadmin: isSuperAdmin,
      },
    });
  } catch (err) {
    console.error('[Auth:Login]', err.message);
    next(err);
  }
}


// ── ME ────────────────────────────────────────────────────────────────────────
export async function me(req, res, next) {
  try {
    const [[user]] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.tenant_id, u.role, u.is_superadmin,
              t.name               AS tenant_name,
              t.subscription_plan  AS tenant_plan,
              t.credits_balance    AS credits_balance
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = ?`,
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isSuperAdmin = user.is_superadmin === 1 || user.role === 'superadmin';

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenant_id: user.tenant_id ?? null,
        role: user.role,
        is_superadmin: isSuperAdmin,
        tenant_name: user.tenant_name ?? null,
        tenant_plan: user.tenant_plan ?? null,
        credits_balance: user.credits_balance ?? 0,
      },
    });
  } catch (err) {
    console.error('[Auth:Me]', err.message);
    next(err);
  }
}


// ── LOGOUT ────────────────────────────────────────────────────────────────────
export function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  });
  res.json({ success: true });
}