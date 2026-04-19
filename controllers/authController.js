const User = require('../models/User');
const jwt  = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const safeUser = (user, token) => ({
  _id:        user._id,
  name:       user.name,
  email:      user.email,
  role:       user.role,
  skills:     user.skills,
  interests:  user.interests,
  location:   user.location,
  trustScore: user.trustScore,
  helpedCount:user.helpedCount,
  solvedCount:user.solvedCount,
  badges:     user.badges,
  token,
});

// ── Validation rules ────────────────────────────────────────
const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Signup ──────────────────────────────────────────────────
const signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { name, email, password, skills = [], interests = [], location = '' } = req.body;

    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, skills, interests, location });
    res.status(201).json(safeUser(user, generateToken(user._id)));
  } catch (err) { next(err); }
};

// ── Login ───────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    res.json(safeUser(user, generateToken(user._id)));
  } catch (err) { next(err); }
};

module.exports = { signup, login, signupValidation, loginValidation };
