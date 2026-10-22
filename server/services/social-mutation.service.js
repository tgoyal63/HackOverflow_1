const user = require('../models/user.model.js').model;
const friend = require('../models/friend.model.js').model;
const vote = require('../models/vote.model.js').model;
const ServiceError = require('../errors/service.error.js');
const { withUserTransaction } = require('../utils/transaction.utils.js');

const hasSingleReference = (references, id) => references.filter((reference) => String(reference) === String(id)).length === 1;

const assertReferenceIntegrity = async (model, references, ownership, label, session) => {
  if (!Array.isArray(references)) throw new ServiceError(409, `Invalid ${label} references require reconciliation.`);
  const uniqueIds = new Set(references.map(String));
  if (uniqueIds.size !== references.length) {
    throw new ServiceError(409, `Duplicate ${label} references require reconciliation.`);
  }
  if (!references.length) return;
  const resolved = await model.countDocuments({ _id: { $in: references }, ...ownership }).session(session).exec();
  if (resolved !== references.length) {
    throw new ServiceError(409, `Dangling or invalid ${label} references require reconciliation.`);
  }
};

const friendPair = async (requester, recipient, session) => {
  const outgoing = await friend.find({ requester, recipient }).limit(2).session(session).exec();
  const incoming = await friend.find({ requester: recipient, recipient: requester }).limit(2).session(session).exec();
  if (outgoing.length > 1 || incoming.length > 1) {
    throw new ServiceError(409, 'Duplicate friendship records require reconciliation.');
  }
  const a = outgoing[0];
  const b = incoming[0];
  if (Boolean(a) !== Boolean(b) || (a && ![[0, 0], [1, 2], [2, 1], [3, 3]].some(([left, right]) => a.status === left && b.status === right))) {
    throw new ServiceError(409, 'Inconsistent friendship records require reconciliation.');
  }
  return [a, b];
};

const changeFriendship = (requester, recipient, action) => withUserTransaction([requester, recipient], async (session, accounts) => {
  await assertReferenceIntegrity(friend, accounts.get(String(requester)).friends, { requester }, 'friendship', session);
  await assertReferenceIntegrity(friend, accounts.get(String(recipient)).friends, { requester: recipient }, 'friendship', session);
  const [a, b] = await friendPair(requester, recipient, session);
  if (a && (!hasSingleReference(accounts.get(String(requester)).friends, a._id) ||
    !hasSingleReference(accounts.get(String(recipient)).friends, b._id))) {
    throw new ServiceError(409, 'Inconsistent friendship references require reconciliation.');
  }
  if (action === 'request') {
    if (a?.status === 3) throw new ServiceError(409, 'Already friends!');
    if (a?.status === 1) throw new ServiceError(409, 'Already sent friend request!');
    if (a?.status === 2) throw new ServiceError(409, 'Already received friend request!');
    const outgoing = a || new friend({ requester, recipient });
    const incoming = b || new friend({ requester: recipient, recipient: requester });
    outgoing.status = 1;
    incoming.status = 2;
    await outgoing.save({ session });
    await incoming.save({ session });
    await user.updateOne({ _id: requester }, { $addToSet: { friends: outgoing._id } }, { session }).exec();
    await user.updateOne({ _id: recipient }, { $addToSet: { friends: incoming._id } }, { session }).exec();
    return;
  }
  if (action === 'accept') {
    if (!a || a.status === 0) throw new ServiceError(400, 'You have not received a friend request!');
    if (a.status === 3) throw new ServiceError(409, 'Already friends!');
    if (a.status === 1) throw new ServiceError(409, 'Already sent friend request!');
    a.status = 3;
    b.status = 3;
    await a.save({ session });
    await b.save({ session });
    return;
  }
  if (!a) throw new ServiceError(404, 'User not found in the list!');
  await friend.deleteMany({ _id: { $in: [a._id, b._id] } }, { session }).exec();
  await user.updateOne({ _id: requester }, { $pull: { friends: a._id } }, { session }).exec();
  await user.updateOne({ _id: recipient }, { $pull: { friends: b._id } }, { session }).exec();
});

const changeVote = (voter, recipient, status) => withUserTransaction([voter, recipient], async (session, accounts) => {
  await assertReferenceIntegrity(vote, accounts.get(String(recipient)).votes, { user: recipient }, 'vote', session);
  const records = await vote.find({ voter, user: recipient }).limit(2).session(session).exec();
  if (records.length > 1) throw new ServiceError(409, 'Duplicate vote records require reconciliation.');
  const existing = records[0];
  if (existing && ![-1, 0, 1].includes(existing.status)) throw new ServiceError(409, 'Invalid vote record requires reconciliation.');
  if (existing && !hasSingleReference(accounts.get(String(recipient)).votes, existing._id)) {
    throw new ServiceError(409, 'Inconsistent vote reference requires reconciliation.');
  }
  if (status === null) {
    if (!existing) throw new ServiceError(404, 'Not voted!');
    if (!existing.status) throw new ServiceError(400, 'User not voted!');
    await vote.deleteOne({ _id: existing._id }, { session }).exec();
    await user.updateOne({ _id: recipient }, { $pull: { votes: existing._id }, $inc: { rating: -existing.status } }, { session }).exec();
    return;
  }
  if (existing?.status === status) throw new ServiceError(409, status === 1 ? 'Already upvoted!' : 'Already downvoted!');
  const previous = existing?.status || 0;
  const record = existing || new vote({ voter, user: recipient });
  record.status = status;
  await record.save({ session });
  await user.updateOne({ _id: recipient }, { $addToSet: { votes: record._id }, $inc: { rating: status - previous } }, { session }).exec();
});

module.exports = { changeFriendship, changeVote };
