const { controllerBoilerPlate, controllerResponse } = require('../utils/controller.utils.js');
const { checkExist } = require('../utils/user.utils.js');
const ControllerError = require('../errors/controller.error.js');
const socialMutation = require('../services/social-mutation.service.js');

const change = (status) => controllerBoilerPlate(async (req) => {
  const { username } = req.params;
  const target = await checkExist('username', username);
  if (!target) throw new ControllerError(404, 'User not found!');
  if (String(target._id) === String(req.user._id)) {
    const action = status === 1 ? 'upvote' : status === -1 ? 'downvote' : 'vote';
    throw new ControllerError(400, `You can't ${action} yourself!`);
  }
  await socialMutation.changeVote(req.user._id, target._id, status);
  return controllerResponse(201, 'Successful');
});

module.exports = { upvote: change(1), downvote: change(-1), remove: change(null) };
