const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getProfile, updateProfile, getLeaderboard, getNotifications, markNotificationsRead } = require('../controllers/userController');
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.get('/leaderboard', getLeaderboard);
router.get('/notifications', protect, getNotifications);
router.patch('/notifications/read', protect, markNotificationsRead);
// All users list for messaging (exclude current user via query)
router.get('/', protect, async (req, res, next) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('name avatar skills location trustScore')
      .sort({ name: 1 })
      .lean();
    res.json(users);
  } catch (err) { next(err); }
});
module.exports = router;
