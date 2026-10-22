const router = require('express').Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { validate } = require('express-validation');
const data = require('../controllers/data.controller.js');
const {socialCheckSchema} = require('../models/user.validators.js');

// GitHub data
router.post('/check/:social', validate(socialCheckSchema), data.socialCheck);
router.get(['/github', '/github/:username'], authMiddleware, data.github);
router.get(['/hackerrank', '/hackerrank/:username'], authMiddleware, data.hackerrank);
router.get(['/codechef', '/codechef/:username'], authMiddleware, data.codechef);

module.exports = router;
