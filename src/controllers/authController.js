const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 24 * 60 * 60 * 1000
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      const err = new Error('name, email, password are required');
      err.status = 400;
      throw err;
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      const err = new Error('User already exists');
      err.status = 400;
      throw err;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password_hash });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const err = new Error('email and password are required');
      err.status = 400;
      throw err;
    }

    const user = await User.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    setAuthCookie(res, token);

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    if (!req.user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const user = await User.findById(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  });
  res.json({ success: true });
}

module.exports = { register, login, me, logout };
