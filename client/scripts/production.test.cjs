const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { readFile, mkdtemp, writeFile, mkdir, symlink, rm } = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const client = path.resolve(__dirname, '..');

test('npm start serves the production bundle on PORT', async (t) => {
  const index = await readFile(path.join(client, 'build/index.html'), 'utf8');
  const manifest = JSON.parse(await readFile(path.join(client, 'build/asset-manifest.json')));
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));

  const child = spawn('npm', ['start'], {
    cwd: client,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (data) => { logs = (logs + data).slice(-10000); });
  }
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      process.kill(-child.pid, 'SIGTERM');
      await exited;
    }
  });

  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(child.exitCode, null, logs);
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
      ready = response.ok;
      await response.arrayBuffer();
      if (ready) break;
    } catch (_) { /* Wait for the process to bind its port. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Production server failed to start: ${logs}`);

  await t.test('root and direct React Router links return the built index', async () => {
    for (const route of ['/', '/dashboard', '/leaderboard', '/settings', '/friends',
      '/changepassword', '/register', '/search/example']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(await response.text(), index, route);
    }
    assert.doesNotMatch(index, /webpack-dev-server|sockjs-node|react-refresh/);
  });

  await t.test('compiled JS and CSS are served with their original content and MIME types', async () => {
    for (const [key, type] of [['main.js', /javascript/], ['main.css', /text\/css/]]) {
      const asset = manifest.files[key];
      const response = await fetch(base + asset);
      assert.equal(response.status, 200, asset);
      assert.match(response.headers.get('content-type'), type);
      assert.equal(await response.text(), await readFile(path.join(client, 'build', asset), 'utf8'));
    }
  });

  await t.test('HEAD supports the service health check without returning a body', async () => {
    const response = await fetch(base, { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
    assert.ok(Number(response.headers.get('content-length')) > 0);
  });
});

test('npm start fails when no production build exists', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'hackoverflow-no-build-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(path.join(directory, 'package.json'), await readFile(path.join(client, 'package.json')));
  await mkdir(path.join(directory, 'scripts'));
  await writeFile(path.join(directory, 'scripts/serve.cjs'), await readFile(path.join(client, 'scripts/serve.cjs')));
  await symlink(path.join(client, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  const child = spawn('npm', ['start'], { cwd: directory, stdio: ['ignore', 'ignore', 'pipe'] });
  let error = '';
  child.stderr.on('data', (data) => { error += data; });
  const [code] = await once(child, 'exit');
  assert.notEqual(code, 0);
  assert.match(error, /ENOENT/);
  assert.match(error, /build\/index\.html/);
});

test('npm start fails if the assigned PORT is occupied', { timeout: 5000 }, async (t) => {
  const listener = net.createServer();
  listener.listen(0, '0.0.0.0');
  await once(listener, 'listening');
  t.after(() => new Promise((resolve) => listener.close(resolve)));
  const child = spawn('npm', ['start'], {
    cwd: client,
    env: { ...process.env, PORT: String(listener.address().port) },
    detached: true,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  t.after(() => { if (child.exitCode === null) process.kill(-child.pid, 'SIGTERM'); });
  let error = '';
  child.stderr.on('data', (data) => { error += data; });
  const [code] = await once(child, 'exit');
  assert.notEqual(code, 0);
  assert.match(error, /EADDRINUSE/);
});
