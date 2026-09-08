// Express app factory (exported separately for tests).
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const requestLogger = require('./middleware/logger');
const { notFound, errorHandler } = require('./middleware/errors');
const routes = require('./routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: config.clientOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));
  if (config.env !== 'test') app.use(requestLogger);

  // Basic rate limiting for auth endpoints.
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { message: 'Too many auth attempts, try again later' } },
    })
  );

  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
