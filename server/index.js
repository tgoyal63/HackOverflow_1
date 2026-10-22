require('dotenv').config();
const { createApp } = require('./app.js');
const { start } = require('./startup.js');

const app = createApp();

if (require.main === module) {
  start(app).then((server) => {
    console.log(`Webservice listening on port: ${server.address().port}`);
  }).catch(() => {
    // Driver errors can include connection strings and credentials.
    console.error('Backend startup failed. Check database configuration, connectivity, and port availability.');
    process.exit(1);
  });
}

// Vercel imports the request handler rather than starting a listening server.
module.exports = app;
