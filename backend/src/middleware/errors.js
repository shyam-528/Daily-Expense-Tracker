// Centralized error handler. Catches async errors + validation failures.
function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, _next) {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : err.status || 500;
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  if (status >= 500) console.error(err.stack || err);

  res.status(status).json({
    error: { message, ...(err.details ? { details: err.details } : {}) },
  });
}

// Wrap async route handlers so rejections reach the error handler.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Helper to throw uniform HTTP errors.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    if (details) this.details = details;
  }
}

module.exports = { notFound, errorHandler, asyncHandler, HttpError };
