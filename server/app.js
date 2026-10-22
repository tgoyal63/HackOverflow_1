const express = require('express');
const cors = require('cors');
const dbConn = require('./utils/db-conn.utils.js');
const { errorHandler } = require('./utils/controller.utils.js');

const createApp = ({ connectDatabase = dbConn.safeConnect } = {}) => {
  const app = express();
  let connection;
  // Serverless invocations share a connection attempt; a later request may retry
  // after a failed connection without retaining a rejected promise.
  app.locals.ensureDatabase = () => {
    if (!connection) {
      connection = Promise.resolve().then(connectDatabase).finally(() => {
        connection = undefined;
      });
    }
    return connection;
  };

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    app.locals.ensureDatabase().then(() => next(), () => {
      res.status(503).json({ statusCode: 503, message: 'Database unavailable.' });
    });
  });
  app.get('/', (req, res) => res.send('Welcome to the Social Coding Experience Portal.'));
  app.use('/', require('./routes/user.routes.js'));
  app.use('/', require('./routes/data.routes.js'));
  app.use('/', require('./routes/friend.routes.js'));
  app.use('/', require('./routes/vote.routes.js'));
  app.use('/', require('./routes/leaderboard.routes.js'));
  app.use(errorHandler);
  return app;
};

module.exports = { createApp };
