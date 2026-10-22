const getPort = (env = process.env) => {
  const value = env.PORT || env.APP_PORT || '8082';
  if (!/^\d+$/.test(String(value))) throw new Error('Invalid application port.');
  const port = Number(value);
  if (port < 1 || port > 65535) throw new Error('Invalid application port.');
  return port;
};

const start = async (app, { port = getPort(), host = '0.0.0.0' } = {}) => {
  await app.locals.ensureDatabase();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);
    server.once('error', reject);
    server.once('listening', () => resolve(server));
  });
};

module.exports = { start, getPort };
