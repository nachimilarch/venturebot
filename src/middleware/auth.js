// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';

function authMiddleware(req, res, next) {
  const bearer = req.headers.authorization;
  const headerToken = bearer && bearer.startsWith('Bearer ')
    ? bearer.slice(7)
    : null;

  const cookieToken = req.cookies?.token;
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const tenantId = decoded.tenant_id ?? decoded.tenantId ?? null;

    req.user = {
      userId: decoded.id || decoded.userId,
      tenantId: tenantId,
      role: decoded.role || 'admin',
      is_superadmin: decoded.role === 'superadmin' || decoded.is_superadmin === true,
    };

    // Allow superadmins through without a tenantId
    if (!req.user.tenantId && !req.user.is_superadmin) {
      return res.status(403).json({
        success: false,
        error: 'Account not linked to a tenant. Please log out and log back in.',
      });
    }

    next();
  } catch (err) {
    console.error('[Auth Middleware] Token verification failed:', err.message);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

function requireAuth(req, res, next) {
  return authMiddleware(req, res, next);
}

function roleMiddleware(roles = []) {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}

// Chains authMiddleware first, then checks superadmin flag
export const superAdminMiddleware = (req, res, next) => {
  authMiddleware(req, res, () => {
    if (!req.user?.is_superadmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  });
};

export { authMiddleware, requireAuth, roleMiddleware };