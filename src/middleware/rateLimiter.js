// src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100
});

export default apiLimiter;
