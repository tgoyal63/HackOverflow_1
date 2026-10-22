// Importing Node Modules
const jwt = require('jsonwebtoken');

// Importing File Dependencies
const ControllerError = require('../errors/controller.error.js');
const userService = require('../services/user.service.js');
const { getSigningKey } = require('../utils/user.utils.js');

module.exports = async (req, res, next) => {
  try {
    // Checking if authorization header is provided
    if (!(req.headers && req.headers.authorization)) throw new ControllerError(403, 'Access denied! No token provided.');
    const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization);
    const token = match && match[1];

    // Checking if token is provided
    if (!token) throw new ControllerError(403, 'Access denied! No token provided.');
    const decodedJWT = jwt.verify(token, getSigningKey(), { algorithms: ['HS256'] });

    // Checking if the user is valid
    if (!decodedJWT || typeof decodedJWT.id !== 'string' || !/^[a-f\d]{24}$/i.test(decodedJWT.id))
      throw new ControllerError(401, 'Unauthorized!');
    const data = await userService.searchByEntity('_id', decodedJWT.id);
    if (data && token === data.token) {
      req.user = data;
      req.id = data._id;
      next();
    } else {
      throw new ControllerError(401, 'Invalid User token!');
    }
  } catch (err) {
    if (!err.status)
      return res.status(401).send({ status: 401, message: "Invalid User Token" });
    return res.status(err.status).send({ status: err.status, message: err.message });
  }
};
