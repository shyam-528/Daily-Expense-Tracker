// Server entrypoint.
const createApp = require('./app');
const config = require('./config');

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Expense Tracker API running on http://localhost:${config.port} (${config.env})`);
});

module.exports = server;
