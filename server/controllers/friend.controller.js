const { controllerBoilerPlate, controllerResponse } = require('../utils/controller.utils.js');
const { checkExist } = require('../utils/user.utils.js');
const socialMutation = require('../services/social-mutation.service.js');
const ControllerError = require('../errors/controller.error.js');

const change = (action, statusCode) => controllerBoilerPlate(async (req) => {
  const { username } = req.params;
  const target = await checkExist('username', username);
  if (!target) throw new ControllerError(404, 'User not found!');
  if (String(target._id) === String(req.user._id)) throw new ControllerError(400, "You can't add yourself!");
  await socialMutation.changeFriendship(req.user._id, target._id, action);
  return controllerResponse(statusCode, 'Successful');
});

module.exports = {
  createFriend: change('request', 201),
  editFriend: change('accept', 204),
  deleteFriend: change('remove', 201),
};
