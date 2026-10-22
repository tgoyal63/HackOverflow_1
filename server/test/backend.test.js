const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { createApp } = require('../app.js');
const { getPort, start } = require('../startup.js');
const { getConnectionUri } = require('../utils/db-conn.utils.js');
const { signToken, hashPassword, checkPassword } = require('../utils/user.utils.js');
const common = require('../utils/common.utils.js');
const userService = require('../services/user.service.js');
const mongoose = require('mongoose');
const { withUserTransaction } = require('../utils/transaction.utils.js');
const { controllerBoilerPlate, errorHandler } = require('../utils/controller.utils.js');
const express = require('express');

const viewer = '111111111111111111111111';
const target = '222222222222222222222222';
const other = '333333333333333333333333';

const serve = async (t, app = createApp({ connectDatabase: async () => {} })) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (path, options) => {
    const response = await fetch(base + path, options);
    const text = await response.text();
    return { status: response.status, body: text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : undefined };
  };
};
const setEnv = (t, key, value) => {
  const previous = process.env[key];
  process.env[key] = value;
  t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
};
const authenticate = (t, user = {}) => {
  setEnv(t, 'SECRET', 'unit-test-key');
  const token = signToken(viewer);
  const account = { _id: viewer, username: 'viewer', token, ...user };
  t.mock.method(userService, 'searchByEntity', async (entity, value) => value === viewer ? account : undefined);
  return { token, account, headers: { Authorization: `Bearer ${token}` } };
};
const adapter = (t, handler) => {
  const previous = axios.defaults.adapter;
  const mock = t.mock.fn(async (config) => ({ status: 200, headers: {}, config, request: {}, ...await handler(config) }));
  axios.defaults.adapter = mock;
  t.after(() => { axios.defaults.adapter = previous; });
  return mock;
};

test('importing the Vercel entry exports a handler without connecting or listening', () => {
  const result = spawnSync(process.execPath, ['-e', "const assert=require('node:assert/strict');assert.equal(typeof require('./index.js'),'function')"], {
    cwd: require('node:path').join(__dirname, '..'),
    env: { ...process.env, MONGODB_URI: 'invalid-uri-that-must-not-connect' }, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
});

test('standalone startup failure exits unsuccessfully without logging database credentials', () => {
  const result = spawnSync(process.execPath, ['index.js'], {
    cwd: require('node:path').join(__dirname, '..'),
    env: { ...process.env, MONGODB_URI: 'invalid-sensitive-fixture-uri' }, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Backend startup failed/);
  assert.doesNotMatch(result.stderr + result.stdout, /invalid-sensitive-fixture-uri/);
});

test('PORT is preferred, APP_PORT remains supported, and invalid ports are rejected', () => {
  assert.equal(getPort({}), 8082);
  assert.equal(getPort({ PORT: '10000', APP_PORT: '8000' }), 10000);
  assert.equal(getPort({ APP_PORT: '8000' }), 8000);
  for (const value of ['8000junk', '-1', '0', '65536', 'Infinity']) assert.throws(() => getPort({ PORT: value }));
});

test('database URI handles localhost, managed hosts and URI-encoded credentials', () => {
  assert.equal(getConnectionUri({}), 'mongodb://localhost:27017/hackoverflow');
  assert.equal(getConnectionUri({ DB_HOST: '127.0.0.1', DB_PORT: '27018' }), 'mongodb://127.0.0.1:27018/hackoverflow');
  assert.equal(getConnectionUri({ DB_HOST: 'cluster.example.test', DB_USER: 'name@example', DB_PASSWORD: 'fixture/p@ss' }),
    'mongodb+srv://name%40example:fixture%2Fp%40ss@cluster.example.test/hackoverflow');
  assert.equal(getConnectionUri({ MONGODB_URI: 'mongodb://test-host/db' }), 'mongodb://test-host/db');
  assert.throws(() => getConnectionUri({ DB_USER: 'partial' }));
});

test('startup waits for database readiness and never listens after connection failure', async () => {
  let listened = false;
  const app = { locals: { ensureDatabase: async () => { throw new Error('fixture unavailable'); } }, listen: () => { listened = true; } };
  await assert.rejects(start(app, { port: 8082 }), /fixture unavailable/);
  assert.equal(listened, false);
});

test('parallel requests share a database connection and preserve the root response', async (t) => {
  let attempts = 0;
  const app = createApp({ connectDatabase: async () => { attempts += 1; await new Promise((resolve) => setTimeout(resolve, 15)); } });
  const request = await serve(t, app);
  const responses = await Promise.all(Array.from({ length: 8 }, () => request('/')));
  assert.equal(attempts, 1);
  responses.forEach((response) => assert.deepEqual(response, { status: 200, body: 'Welcome to the Social Coding Experience Portal.' }));
});

test('a failed database request returns 503 and a later request can recover', async (t) => {
  let attempts = 0;
  const request = await serve(t, createApp({ connectDatabase: async () => { if (++attempts === 1) throw new Error('sensitive driver fixture'); } }));
  assert.deepEqual(await request('/'), { status: 503, body: { statusCode: 503, message: 'Database unavailable.' } });
  assert.equal((await request('/')).status, 200);
});

test('validation errors are JSON 400 responses before service or provider calls', async (t) => {
  const request = await serve(t);
  const query = t.mock.method(userService, 'searchByEntity', async () => { throw new Error('must not be called'); });
  for (const [path, body] of [['/signup', { name: 'name', username: 'name', password: 'password', email: 'a@example.com' }],
    ['/check/unknown', { username: 'fixture' }], ['/check/github', { email: 'a@example.com' }]]) {
    const response = await request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 400);
    assert.equal(typeof response.body.message, 'string');
  }
  assert.equal(query.mock.callCount(), 0);
});

test('missing JWT configuration fails signup before creating an unusable account', async (t) => {
  setEnv(t, 'SECRET', '');
  const create = t.mock.method(userService, 'create', async () => { throw new Error('must not create'); });
  const upstream = adapter(t, async () => { throw new Error('must not request'); });
  const response = await (await serve(t))('/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
    name: 'Fixture', username: 'fixture', email: 'fixture@example.com', password: 'fixture-password',
    socials: { github: 'fixture', hackerrank: 'fixture', codechef: 'fixture' },
  }) });
  assert.equal(response.status, 503);
  assert.equal(create.mock.callCount(), 0);
  assert.equal(upstream.mock.callCount(), 0);
});

test('malformed JSON and excessive request bodies are bounded JSON errors', async (t) => {
  const request = await serve(t);
  const malformed = await request('/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.deepEqual(malformed, { status: 400, body: { statusCode: 400, message: 'Invalid JSON request.' } });
  const large = await request('/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payload: 'x'.repeat(110000) }) });
  assert.equal(large.status, 413);
  assert.equal(large.body.message, 'Request body too large.');
});

test('authentication rejects missing, malformed, unsupported-algorithm and revoked tokens', async (t) => {
  const { token } = authenticate(t);
  const request = await serve(t);
  assert.equal((await request('/profile')).status, 403);
  assert.equal((await request('/profile', { headers: { Authorization: `Other ${token}` } })).status, 403);
  const differentAlgorithm = jwt.sign({ id: viewer }, process.env.SECRET, { algorithm: 'HS384' });
  assert.equal((await request('/profile', { headers: { Authorization: `Bearer ${differentAlgorithm}` } })).status, 401);
  const malformedSubject = jwt.sign({ id: { $ne: null } }, process.env.SECRET);
  assert.equal((await request('/profile', { headers: { Authorization: `Bearer ${malformedSubject}` } })).status, 401);
  const revoked = signToken(viewer);
  assert.notEqual(revoked, token);
  assert.equal((await request('/profile', { headers: { Authorization: `Bearer ${revoked}` } })).status, 401);
});

test('search reports only the requesting user relationship, never an unrelated first friend', async (t) => {
  const { account, headers } = authenticate(t);
  const searched = { _id: target, name: 'Target', username: 'target', socials: {}, rating: 100,
    friends: [{ recipient: other, status: 3 }, { recipient: viewer, status: 1 }], votes: [{ voter: viewer, status: 1 }] };
  t.mock.method(userService, 'searchByEntity', async (entity, value) => value === viewer ? account : structuredClone(searched));
  t.mock.method(userService, 'getVotesData', async (id, status) => status === 1 ? ['viewer'] : []);
  const request = await serve(t);
  const options = { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ username: 'target' }) };
  const response = await request('/search', options);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, 'pending');
  assert.equal(response.body.data.voteStatus, 'upvoted');
  assert.equal(response.body.data.upvotes, 1);
  searched.friends = [{ recipient: other, status: 3 }];
  assert.equal((await request('/search', options)).body.data.status, 'add');
});

test('unsupported standalone MongoDB transactions fail closed with an actionable 503', async (t) => {
  t.mock.method(mongoose.connection, 'transaction', async () => { throw Object.assign(new Error('Transactions are unsupported'), { code: 20 }); });
  await assert.rejects(withUserTransaction([viewer, target], () => { throw new Error('must not run'); }),
    (error) => error.status === 503 && /replica set/.test(error.message));
});

test('unknown friend-list type is rejected before querying storage', async (t) => {
  const { headers } = authenticate(t);
  const query = t.mock.method(userService, 'getFriendsData', async () => { throw new Error('must not query'); });
  const response = await (await serve(t))('/friends/unknown', { headers });
  assert.equal(response.status, 400);
  assert.equal(query.mock.callCount(), 0);
});

test('changing a password updates a local hash, rotates the token and keeps globals untouched', async (t) => {
  const { account, headers, token } = authenticate(t, { password: hashPassword('old-password') });
  let updated;
  t.mock.method(userService, 'updateById', async (id, body) => { assert.equal(id, viewer); updated = body; return { ...account, ...body }; });
  const response = await (await serve(t))('/password', { method: 'PATCH', headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ currentPassword: 'old-password', newPassword: 'new-password' }) });
  assert.equal(response.status, 201);
  assert.equal(checkPassword('new-password', updated.password), true);
  assert.equal(checkPassword('old-password', updated.password), false);
  assert.notEqual(response.body.data.token, token);
  assert.equal(global.password, undefined);
  assert.equal(global.token, undefined);
});

test('social requests encode handles and enforce time and response-size limits', async (t) => {
  let config;
  adapter(t, async (value) => { config = value; return { data: { login: 'fixture' } }; });
  await common.getSocialData('github', 'fixture?admin=true/extra');
  assert.equal(config.url, 'https://api.github.com/users/fixture%3Fadmin%3Dtrue%2Fextra');
  assert.equal(config.timeout, 10000);
  assert.equal(config.maxContentLength, 2 * 1024 * 1024);
  assert.equal(config.maxBodyLength, 2 * 1024 * 1024);
});

test('provider network errors and timeouts never dereference absent response or leak config', async (t) => {
  let code = 'ECONNRESET';
  adapter(t, async () => { throw Object.assign(new Error('sensitive-fixture'), { code, config: { token: 'sensitive-fixture' } }); });
  await assert.rejects(common.getSocialData('github', 'fixture'), (error) => error.status === 502 && !error.message.includes('sensitive-fixture'));
  code = 'ECONNABORTED';
  await assert.rejects(common.getSocialData('github', 'fixture'), (error) => error.status === 504);
});

test('provider 404 stays a user miss while outage and rate limits fail validation closed', async (t) => {
  let status = 404;
  adapter(t, async () => ({ status, data: status === 403 ? { message: 'API rate limit exceeded' } : {} }));
  assert.equal((await common.getSocialData('github', 'fixture')).status, 404);
  status = 503;
  await assert.rejects(common.getSocialData('github', 'fixture'), (error) => error.status === 502);
  status = 403;
  assert.equal((await common.getSocialData('github', 'fixture')).statusText, 'rate limit exceeded');
  await assert.rejects(common.checkAllSocials({ github: 'fixture' }), (error) => error.status === 503);
});

test('the social-check endpoint distinguishes GitHub rate limits from a missing user', async (t) => {
  let upstreamStatus = 403;
  adapter(t, async () => ({ status: upstreamStatus, headers: { 'x-ratelimit-remaining': '0' },
    data: upstreamStatus === 403 ? { message: 'API rate limit exceeded' } : { login: 'fixture' } }));
  const request = await serve(t);
  const check = () => request('/check/github', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'fixture' }) });
  const limited = await check();
  assert.equal(limited.status, 503);
  assert.match(limited.body.message, /validation unavailable/i);
  upstreamStatus = 404;
  assert.equal((await check()).status, 404);
  upstreamStatus = 200;
  assert.deepEqual(await check(), { status: 201, body: { statusCode: 201, message: 'Successful', data: { isExist: true } } });
});

test('missing Codechef credentials produce a controlled 503 without requesting OAuth', async (t) => {
  setEnv(t, 'CODECHEF_CLIENT_ID', '');
  setEnv(t, 'CODECHEF_CLIENT_SECRET', '');
  const spy = adapter(t, async () => { throw new Error('must not request'); });
  await assert.rejects(common.getSocialData('codechef', 'fixture'), (error) => error.status === 503);
  assert.equal(spy.mock.callCount(), 0);
});

test('HackerRank empty and numeric-string submission histories are request-local totals', async (t) => {
  const { headers } = authenticate(t);
  adapter(t, async (config) => {
    if (config.url.endsWith('/profile')) return { data: { model: { username: 'fixture', created_at: '2020-01-01', level: 1, followers_count: 0 } } };
    if (config.url.endsWith('/badges')) return { data: { models: [] } };
    return { data: config.url.includes('/empty/') ? {} : { day1: '2', day2: 3, day3: '4' } };
  });
  const request = await serve(t);
  const [empty, count] = await Promise.all([request('/hackerrank/empty', { headers }), request('/hackerrank/fixture', { headers })]);
  assert.equal(empty.status, 201);
  assert.equal(count.status, 201);
  assert.equal(empty.body.data.totalSubmissions, 0);
  assert.equal(count.body.data.totalSubmissions, 9);
  assert.equal(global.totalSubmissions, undefined);
});

test('unexpected controller errors hide driver data and synchronous throws are caught', async (t) => {
  const app = express();
  app.get('/', controllerBoilerPlate(() => { throw Object.assign(new Error('sensitive-driver-fixture'), { config: { secret: 'fixture' } }); }));
  app.use(errorHandler);
  assert.deepEqual(await (await serve(t, app))('/'), { status: 500, body: { statusCode: 500, message: 'Internal server error.' } });
});
