const { ValidationError } = require('express-validation');
const ControllerError = require('../errors/controller.error.js');
const ServiceError = require('../errors/service.error.js');

const controllerResponse = (statusCode, message, data) => {
  return {
    statusCode,
    message,
    data,
  };
};

const controllerBoilerPlate = (wrapped) => (req, res, next) => Promise.resolve()
  .then(() => wrapped(req, res, next))
  .catch((err) => {
    if (err instanceof ControllerError || err instanceof ServiceError) {
      return controllerResponse(err.status, err.message, err.data);
    } else if (err.code === 11000) {
      return controllerResponse(409, 'User already exists!');
    }
    return controllerResponse(500, 'Internal server error.');
  }).then((response) => res.status(response.statusCode).send(response)).catch(next);

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof ValidationError) {
    const details = Object.values(err.details || {}).flat();
    return res.status(err.statusCode).json({
      statusCode: err.statusCode,
      name: err.name,
      message: details[0]?.message || 'Invalid request.',
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(controllerResponse(400, 'Invalid JSON request.'));
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json(controllerResponse(413, 'Request body too large.'));
  }
  return res.status(500).json(controllerResponse(500, 'Internal server error.'));
};

module.exports = {
  controllerResponse,
  controllerBoilerPlate,
  errorHandler,
};
