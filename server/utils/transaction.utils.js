const mongoose = require('mongoose');
const user = require('../models/user.model.js').model;
const ServiceError = require('../errors/service.error.js');

// Every social mutation first writes the same existing user documents in sorted
// order. MongoDB's transaction conflict retry then serializes overlapping work,
// including first-time upserts, without adding unique indexes to legacy data.
const withUserTransaction = async (ids, operation) => {
  try {
    return await mongoose.connection.transaction(async (session) => {
      const accounts = new Map();
      for (const id of [...new Set(ids.map(String))].sort()) {
        const account = await user.findOneAndUpdate({ _id: id }, { $inc: { __v: 1 } }, { session, new: true }).exec();
        if (!account) throw new ServiceError(404, 'User not found!');
        accounts.set(id, account);
      }
      return operation(session, accounts);
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      maxCommitTimeMS: 10000,
    });
  } catch (error) {
    if (error.code === 20 || /Transaction numbers are only allowed|does not support retryable writes/i.test(error.message)) {
      throw new ServiceError(503, 'Database transactions unavailable. Configure a MongoDB replica set.');
    }
    throw error;
  }
};

module.exports = { withUserTransaction };
