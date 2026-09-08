// HTTP request logger (morgan-style, zero deps) with ANSI colors.
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const color =
      res.statusCode >= 500
        ? '\x1b[31m'
        : res.statusCode >= 400
          ? '\x1b[33m'
          : '\x1b[32m';
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${color}${res.statusCode}\x1b[0m - ${ms}ms`
    );
  });
  next();
}

module.exports = requestLogger;
