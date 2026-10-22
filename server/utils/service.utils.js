const ServiceError = require('../errors/service.error.js');

const serviceBoilerPlate = (wrapped) => (...params) => wrapped(...params).catch((err) => {
  if (err.code === 11000) {
    throw new ServiceError(409, 'User already exists!');
  } else if (err.name === 'CastError') {
    throw new ServiceError(403, 'Invalid identifier.');
  } else throw err;
});

module.exports = {
  serviceBoilerPlate,
};
