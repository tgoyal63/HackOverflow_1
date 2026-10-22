const mongoose = require('mongoose');

// Preserve Mongoose 6's existing query-filter behavior explicitly.
mongoose.set('strictQuery', true);

const getConnectionUri = (env = process.env) => {
  if (env.MONGODB_URI) return env.MONGODB_URI;
  const dbHost = env.DB_HOST || 'localhost';
  const dbName = encodeURIComponent(env.DB_NAME || 'hackoverflow');
  const username = env.DB_USER || '';
  const password = env.DB_PASSWORD || '';
  if (Boolean(username) !== Boolean(password)) throw new Error('Incomplete database credentials.');
  const credentials = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(dbHost);
  const port = local ? `:${env.DB_PORT || '27017'}` : '';
  return `${local ? 'mongodb' : 'mongodb+srv'}://${credentials}${dbHost}${port}/${dbName}`;
};

const connect = () => mongoose.connect(getConnectionUri(), {
  serverSelectionTimeoutMS: 10000,
  maxPoolSize: 10,
});

module.exports = { connect, safeConnect: connect, getConnectionUri };
