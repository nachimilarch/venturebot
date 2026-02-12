const { log } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  log('Error:', err.message, err.stack);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error'
  });
}

module.exports = errorHandler;
