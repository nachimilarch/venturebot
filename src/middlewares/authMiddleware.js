const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email };
    return next();
  } catch (err) {
    req.user = null;
    return next();
  }
}

module.exports = authMiddleware;
