const router = require('express').Router();
const { validate } = require('express-validation');
const user = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { signUpSchema, loginSchema, checkSchema, editSchema, changePasswordSchema } = require('../models/user.validators.js');

// User Routes
router.post('/signup', validate(signUpSchema), user.createUser);
router.post('/login', validate(loginSchema), user.login);
router.patch('/edit', authMiddleware, validate(editSchema), user.editUser);
router.post('/check', validate(checkSchema), user.check);
router.post('/search', authMiddleware, validate(checkSchema), user.search);
router.get('/profile', authMiddleware, user.profile);
router.patch('/password', authMiddleware, validate(changePasswordSchema), user.changePassword);
router.get('/friends/:type', authMiddleware, user.getFriends);
// router.get('/votes/:type', authMiddleware, user.getVotes);

module.exports = router;
