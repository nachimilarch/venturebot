const rateLimit = require('express-rate-limit');

/* Basic IP-level rate limiter to protect APIs from abuse */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = apiLimiter;
