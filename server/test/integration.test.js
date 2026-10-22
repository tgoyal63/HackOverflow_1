const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const mongoose = require('mongoose');
const { createApp } = require('../app.js');
const user = require('../models/user.model.js').model;
const friend = require('../models/friend.model.js').model;
const vote = require('../models/vote.model.js').model;
const userService = require('../services/user.service.js');
const leaderboardService = require('../services/leaderboard.service.js');
const { signToken, hashPassword } = require('../utils/user.utils.js');
const jwt = require('jsonwebtoken');

const uri = process.env.MONGODB_TEST_URI;

test('MongoDB integration: stored-data compatibility, authorization, friendships, votes and password recovery', { skip: !uri }, async (t) => {
  const location = new URL(uri);
  assert.equal(location.protocol, 'mongodb:');
  assert.ok(['127.0.0.1', 'localhost'].includes(location.hostname), 'Only a loopback disposable MongoDB is allowed');
  assert.match(location.pathname, /^\/hackoverflow_test_[A-Za-z0-9_]+$/, 'Integration database must have a disposable test name');
  assert.equal(location.username, '');
  assert.equal(location.password, '');
  const previousSecret = process.env.SECRET;
  process.env.SECRET = 'isolated-integration-fixture-key';
  t.after(() => { if (previousSecret === undefined) delete process.env.SECRET; else process.env.SECRET = previousSecret; });
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  await Promise.all([user.init(), friend.init(), vote.init()]);
  const app = createApp({ connectDatabase: async () => {} });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise((resolve) => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, account, body, method = body ? 'POST' : 'GET') => {
    const response = await fetch(base + path, { method, headers: {
      ...(account ? { Authorization: `Bearer ${account.token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  };
  const account = async (username) => {
    const document = await user.create({ name: username, username, email: `${username}@example.com`, password: hashPassword('fixture-password'),
      socials: { github: username, hackerrank: username, codechef: username } });
    document.token = signToken(String(document._id));
    await document.save();
    return document;
  };
  const pair = async (requester, recipient, statusA, statusB) => {
    const [a, b] = await friend.create([
      { requester: requester._id, recipient: recipient._id, status: statusA },
      { requester: recipient._id, recipient: requester._id, status: statusB },
    ]);
    await userService.updateById(requester._id, { $addToSet: { friends: a._id } });
    await userService.updateById(recipient._id, { $addToSet: { friends: b._id } });
  };
  const viewer = await account('viewer');
  const target = await account('target');
  const unrelated = await account('unrelated');
  const pending = await account('pending');

  await t.test('existing signed users and username/email login retain their public response contracts', async () => {
    // Tokens issued before JWT IDs were added must continue to authenticate.
    viewer.token = jwt.sign({ id: String(viewer._id) }, process.env.SECRET, { expiresIn: '9999 years' });
    await viewer.save();
    for (const credentials of [{ username: viewer.username }, { email: viewer.email }]) {
      const response = await request('/login', undefined, { ...credentials, password: 'fixture-password' });
      assert.equal(response.status, 200);
      assert.equal(response.body.data.token, viewer.token);
    }
    const profile = await request('/profile', viewer);
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.username, viewer.username);
    assert.equal(profile.body.data.upvotes, 0);
    assert.equal(profile.body.data.downvotes, 0);
    assert.equal(profile.body.data.password, undefined);
    assert.equal(profile.body.data.token, undefined);
  });

  await t.test('search ignores unrelated friends and resolves the viewer-specific request direction', async () => {
    await pair(target, unrelated, 3, 3);
    await pair(target, viewer, 1, 2);
    const response = await request('/search', viewer, { username: target.username });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, 'pending');
    const pendingList = await request('/friends/requests', viewer);
    assert.deepEqual(pendingList.body.data.friends, [target.username]);
    const noRelation = await request('/search', pending, { username: target.username });
    assert.equal(noRelation.body.data.status, 'add');
  });

  await t.test('friend acceptance enforces inbound requests and the friends leaderboard excludes pending requests', async () => {
    await pair(viewer, pending, 1, 2);
    assert.deepEqual((await leaderboardService.find(viewer._id)).map((entry) => entry.username), ['viewer']);
    const missing = await request(`/acceptfriend/${unrelated.username}`, viewer);
    assert.equal(missing.status, 400);
    const sent = await request(`/acceptfriend/${pending.username}`, viewer);
    assert.equal(sent.status, 409);
    assert.equal((await request(`/acceptfriend/${target.username}`, viewer)).status, 204);
    const names = (await request('/leaderboard/friends', viewer)).body.data.map((entry) => entry.username).sort();
    assert.deepEqual(names, ['target', 'viewer']);
    const friends = await request('/friends/all', viewer);
    assert.deepEqual(friends.body.data.friends, ['target']);
  });

  await t.test('vote up/down/remove preserve totals and reject self/duplicate votes', async () => {
    assert.equal((await request(`/upvote/${viewer.username}`, viewer)).status, 400);
    assert.equal((await request(`/upvote/${target.username}`, viewer)).status, 201);
    assert.equal((await request(`/upvote/${target.username}`, viewer)).status, 409);
    let profile = await request('/search', viewer, { username: target.username });
    assert.equal(profile.body.data.rating, 101);
    assert.equal(profile.body.data.upvotes, 1);
    assert.equal(profile.body.data.voteStatus, 'upvoted');
    assert.equal((await request(`/downvote/${target.username}`, viewer)).status, 201);
    profile = await request('/search', viewer, { username: target.username });
    assert.equal(profile.body.data.rating, 99);
    assert.equal(profile.body.data.downvotes, 1);
    assert.equal(profile.body.data.upvotes, 0);
    assert.equal((await request(`/removevote/${target.username}`, viewer, undefined, 'DELETE')).status, 201);
    profile = await request('/search', viewer, { username: target.username });
    assert.equal(profile.body.data.rating, 100);
    assert.equal(profile.body.data.voteStatus, 'neutral');
    assert.equal(await vote.countDocuments({ voter: viewer._id, user: target._id }), 0);
  });

  await t.test('password changes revoke the old token and retain login access using the new password', async () => {
    const invalid = await request('/password', viewer, { currentPassword: 'wrong-password', newPassword: 'updated-password' }, 'PATCH');
    assert.equal(invalid.status, 401);
    const response = await request('/password', viewer, { currentPassword: 'fixture-password', newPassword: 'updated-password' }, 'PATCH');
    assert.equal(response.status, 201);
    assert.notEqual(response.body.data.token, viewer.token);
    assert.equal((await request('/profile', viewer)).status, 401);
    const login = await request('/login', undefined, { username: viewer.username, password: 'updated-password' });
    assert.equal(login.status, 200);
    viewer.token = login.body.data.token;
    assert.equal((await request('/profile', viewer)).status, 200);
    assert.equal((await request('/login', undefined, { username: viewer.username, password: 'fixture-password' })).status, 401);
  });

  await t.test('model validation rejects invalid relationship and vote states', async () => {
    await assert.rejects(friend.create({ requester: viewer._id, recipient: target._id, status: 99 }), (error) => error.name === 'ValidationError' && error.errors.status.kind === 'enum');
    await assert.rejects(vote.create({ voter: viewer._id, user: target._id, status: 99 }), (error) => error.name === 'ValidationError' && error.errors.status.kind === 'enum');
  });

  await t.test('concurrent duplicate votes increment the rating exactly once', async () => {
    const source = await account('concurrent-voter');
    const recipient = await account('concurrent-vote-target');
    const responses = await Promise.all(Array.from({ length: 10 }, () => request(`/upvote/${recipient.username}`, source)));
    assert.equal(responses.filter((response) => response.status === 201).length, 1);
    assert.equal(responses.filter((response) => response.status === 409).length, 9);
    const stored = await user.findById(recipient._id).lean();
    assert.equal(stored.rating, 101);
    assert.equal(stored.votes.length, 1);
    assert.equal(await vote.countDocuments({ voter: source._id, user: recipient._id }), 1);
  });

  await t.test('concurrent duplicate friend requests create exactly one mirrored pair', async () => {
    const source = await account('concurrent-requester');
    const recipient = await account('concurrent-recipient');
    const responses = await Promise.all(Array.from({ length: 8 }, () => request(`/addfriend/${recipient.username}`, source)));
    assert.equal(responses.filter((response) => response.status === 201).length, 1);
    assert.equal(responses.filter((response) => response.status === 409).length, 7);
    assert.equal(await friend.countDocuments({ requester: source._id, recipient: recipient._id }), 1);
    assert.equal(await friend.countDocuments({ requester: recipient._id, recipient: source._id }), 1);
    assert.equal((await user.findById(source._id)).friends.length, 1);
    assert.equal((await user.findById(recipient._id)).friends.length, 1);
  });

  await t.test('mid-flight friend failure rolls back both mirrored documents and user references', async (t) => {
    const source = await account('rollback-requester');
    const recipient = await account('rollback-recipient');
    const update = user.updateOne;
    t.mock.method(user, 'updateOne', function (query, body, options) {
      if (String(query._id) === String(recipient._id) && body.$addToSet?.friends) throw new Error('injected persistence failure');
      return update.call(this, query, body, options);
    });
    const response = await request(`/addfriend/${recipient.username}`, source);
    assert.equal(response.status, 500);
    assert.equal(await friend.countDocuments({ requester: { $in: [source._id, recipient._id] } }), 0);
    assert.equal((await user.findById(source._id)).friends.length, 0);
    assert.equal((await user.findById(recipient._id)).friends.length, 0);
  });

  await t.test('mid-flight vote failure rolls back the vote, rating and reference', async (t) => {
    const source = await account('rollback-voter');
    const recipient = await account('rollback-vote-target');
    const update = user.updateOne;
    t.mock.method(user, 'updateOne', function (query, body, options) {
      if (String(query._id) === String(recipient._id) && body.$inc?.rating) throw new Error('injected rating failure');
      return update.call(this, query, body, options);
    });
    assert.equal((await request(`/upvote/${recipient.username}`, source)).status, 500);
    assert.equal(await vote.countDocuments({ voter: source._id, user: recipient._id }), 0);
    const stored = await user.findById(recipient._id).lean();
    assert.equal(stored.rating, 100);
    assert.equal(stored.votes.length, 0);
  });

  await t.test('legacy duplicate vote and friendship rows fail closed without deleting or migrating data', async () => {
    const source = await account('legacy-source');
    const recipient = await account('legacy-target');
    await friend.create([
      { requester: source._id, recipient: recipient._id, status: 1 },
      { requester: source._id, recipient: recipient._id, status: 1 },
      { requester: recipient._id, recipient: source._id, status: 2 },
    ]);
    const response = await request(`/addfriend/${recipient.username}`, source);
    assert.equal(response.status, 409);
    assert.match(response.body.message, /reconciliation/);
    assert.equal(await friend.countDocuments({ requester: source._id, recipient: recipient._id }), 2);
    const duplicates = await vote.create([
      { voter: source._id, user: recipient._id, status: 1 },
      { voter: source._id, user: recipient._id, status: 1 },
    ]);
    await user.updateOne({ _id: recipient._id }, { $set: { rating: 102, votes: duplicates.map((entry) => entry._id) } });
    const voteResponse = await request(`/downvote/${recipient.username}`, source);
    assert.equal(voteResponse.status, 409);
    assert.match(voteResponse.body.message, /reconciliation/);
    assert.equal(await vote.countDocuments({ voter: source._id, user: recipient._id }), 2);
    assert.equal((await user.findById(recipient._id)).rating, 102);
  });

  await t.test('legacy missing reciprocal friendship references require reconciliation before any mutation', async () => {
    const source = await account('partial-friend-source');
    const recipient = await account('partial-friend-target');
    await pair(source, recipient, 2, 1);
    const outgoing = await friend.findOne({ requester: source._id, recipient: recipient._id });
    const incoming = await friend.findOne({ requester: recipient._id, recipient: source._id });
    for (const [owner, record] of [[source, outgoing], [recipient, incoming]]) {
      await user.updateOne({ _id: owner._id }, { $pull: { friends: record._id } });
      const before = await friend.find({ _id: { $in: [outgoing._id, incoming._id] } }).sort({ _id: 1 }).lean();
      for (const [path, method] of [['acceptfriend', 'GET'], ['addfriend', 'GET'], ['delete', 'DELETE']]) {
        const response = await request(`/${path}/${recipient.username}`, source, undefined, method);
        assert.equal(response.status, 409, 'Partial friendship references must block mutations');
        assert.match(response.body.message, /reconciliation/);
        assert.deepEqual(await friend.find({ _id: { $in: [outgoing._id, incoming._id] } }).sort({ _id: 1 }).lean(), before);
        assert.equal((await user.findById(owner._id)).friends.length, 0);
      }
      await user.updateOne({ _id: owner._id }, { $addToSet: { friends: record._id } });
    }
  });

  await t.test('legacy existing vote without a recipient reference cannot apply an unknown rating delta', async () => {
    const source = await account('partial-vote-source');
    const recipient = await account('partial-vote-target');
    const existing = await vote.create({ voter: source._id, user: recipient._id, status: 1 });
    for (const [path, method] of [['downvote', 'GET'], ['upvote', 'GET'], ['removevote', 'DELETE']]) {
      const response = await request(`/${path}/${recipient.username}`, source, undefined, method);
      const stored = await user.findById(recipient._id).lean();
      assert.equal(response.status, 409, `Partial vote state must fail closed; received HTTP ${response.status}, rating ${stored.rating}`);
      assert.match(response.body.message, /reconciliation/);
      assert.equal(stored.rating, 100);
      assert.equal(stored.votes.length, 0);
      assert.equal((await vote.findById(existing._id)).status, 1);
    }
  });

  await t.test('dangling, duplicate and wrong-owner vote references block every mutation without changing legacy data', async () => {
    for (const kind of ['dangling', 'duplicate', 'wrong-owner']) {
      const source = await account(`vote-ref-${kind}-source`);
      const recipient = await account(`vote-ref-${kind}-target`);
      const other = await account(`vote-ref-${kind}-other`);
      const record = await vote.create({ voter: source._id, user: kind === 'wrong-owner' ? other._id : recipient._id, status: 1 });
      await user.updateOne({ _id: recipient._id }, { $set: {
        rating: kind === 'wrong-owner' ? 100 : 101,
        votes: kind === 'duplicate' ? [record._id, record._id] : [record._id],
      } });
      if (kind === 'dangling') await vote.deleteOne({ _id: record._id });
      const before = await user.findById(recipient._id).lean();
      const rowsBefore = await vote.find({ _id: record._id }).lean();
      for (const [path, method] of [['upvote', 'GET'], ['downvote', 'GET'], ['removevote', 'DELETE']]) {
        const response = await request(`/${path}/${recipient.username}`, source, undefined, method);
        const stored = await user.findById(recipient._id).lean();
        assert.equal(response.status, 409, `${kind} vote references must fail closed; HTTP ${response.status}, rating ${stored.rating}`);
        assert.match(response.body.message, /reconciliation/);
        assert.deepEqual(stored, before);
        assert.deepEqual(await vote.find({ _id: record._id }).lean(), rowsBefore);
        assert.equal(await vote.countDocuments({ voter: source._id, user: recipient._id }), kind === 'duplicate' ? 1 : 0);
      }
    }
  });

  await t.test('dangling, duplicate and wrong-owner friendship references block mutations without repairing legacy data', async () => {
    for (const kind of ['dangling-source', 'dangling-target', 'duplicate', 'wrong-owner']) {
      const source = await account(`friend-ref-${kind}-source`);
      const recipient = await account(`friend-ref-${kind}-target`);
      const other = await account(`friend-ref-${kind}-other`);
      if (kind.startsWith('dangling')) {
        await pair(source, recipient, 3, 3);
        await friend.deleteMany({ requester: { $in: [source._id, recipient._id] } });
        if (kind === 'dangling-target') await user.updateOne({ _id: source._id }, { $set: { friends: [] } });
      } else {
        const record = await friend.create({ requester: kind === 'wrong-owner' ? other._id : source._id, recipient: other._id, status: 3 });
        await user.updateOne({ _id: source._id }, { $set: { friends: kind === 'duplicate' ? [record._id, record._id] : [record._id] } });
      }
      const sourceBefore = await user.findById(source._id).lean();
      const targetBefore = await user.findById(recipient._id).lean();
      const rowsBefore = await friend.find({ requester: { $in: [source._id, recipient._id, other._id] } }).sort({ _id: 1 }).lean();
      for (const [path, method] of [['addfriend', 'GET'], ['acceptfriend', 'GET'], ['delete', 'DELETE']]) {
        const response = await request(`/${path}/${recipient.username}`, source, undefined, method);
        assert.equal(response.status, 409, `${kind} friendship references must block ${path}`);
        assert.match(response.body.message, /reconciliation/);
        assert.deepEqual(await user.findById(source._id).lean(), sourceBefore);
        assert.deepEqual(await user.findById(recipient._id).lean(), targetBefore);
        assert.deepEqual(await friend.find({ requester: { $in: [source._id, recipient._id, other._id] } }).sort({ _id: 1 }).lean(), rowsBefore);
      }
    }
  });
});
