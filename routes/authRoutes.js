const express = require('express');
const router  = express.Router();
const { signup, login, signupValidation, loginValidation } = require('../controllers/authController');

router.post('/signup', signupValidation, signup);
router.post('/login',  loginValidation,  login);

module.exports = router;
