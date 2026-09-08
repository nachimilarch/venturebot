// src/middleware/errorHandler.js
import { log } from '../utils/logger.js';

function errorHandler(err, req, res, next) {
  const log = log.log || console.log;
  log('Error:', err.message, err.stack);

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error'
  });
}

export default errorHandler;
