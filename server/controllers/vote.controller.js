// Importing File Dependencies
const { controllerBoilerPlate, controllerResponse } = require('../utils/controller.utils.js');
const { checkExist } = require('../utils/user.utils.js');
const friendService = require('../services/friend.service.js');
const userService = require('../services/user.service.js');
const ControllerError = require('../errors/controller.error.js');

module.exports = {

  // Sending Friend Request
  upvote: ('/upvote/:username', controllerBoilerPlate(async (req) => {
    const { username } = req.params;
    const data = await checkExist("username", username);
    if (!data)
      throw new ControllerError(404, "User not found!");

    const docA = await voteService.create({
      userId: data.user._id, 
      upVotes: { $addToSet: { friends: docA._id } }
    });
    const docB = await friendService.create({ recipient: req.user._id, requester: data._id }, { $set: { status: 2 } });

    const updateUserA = await userService.updateById(req.user._id, { $addToSet: { friends: docA._id } });
    const updateUserB = await userService.updateById(data._id, { $addToSet: { friends: docB._id } });
    return controllerResponse(201, 'Successful');
  })),

  // Accepting Friend Request
  editFriend: ('/acceptfriend/:username', controllerBoilerPlate(async (req) => {
    const { username } = req.params;
    const data = await checkExist("username", username);
    if (!data)
      throw new ControllerError(404, "User not found!");

    const docA = await friendService.update({ requester: req.user._id, recipient: data._id }, { $set: { status: 3 } });
    const docB = await friendService.update({ recipient: req.user._id, requester: data._id }, { $set: { status: 3 } });
    return controllerResponse(204, 'Successful');
  })),

  // Rejecting Friend Request
  deleteFriend: ('/rejectfriend/:username', controllerBoilerPlate(async (req) => {
    const { username } = req.params;
    const data = await checkExist("username", username);
    if (!data)
      throw new ControllerError(404, "User not found!");

    const docA = await friendService.delete({ requester: req.user._id, recipient: data._id });
    const docB = await friendService.delete({ recipient: req.user._id, requester: data._id });

    const updateUserA = await userService.updateById(req.user._id, { $pull: { friends: docA._id } });
    const updateUserB = await userService.updateById(data._id, { $pull: { friends: docB._id } });
    return controllerResponse(201, 'Successful');
  })),

  getFriendsLogs: ('/friendsLogs', controllerBoilerPlate(async (req) => {
    const data = await friendService.search({requester: req.user._id, status: 3});
    return controllerResponse(200, data);
  }))

};