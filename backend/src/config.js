// Central environment + database configuration.
require('dotenv').config();

const path = require('path');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  dbPath: process.env.DB_PATH
    ? path.resolve(__dirname, '..', process.env.DB_PATH)
    : path.join(__dirname, '../../data/expenses.db'),
};

module.exports = config;
