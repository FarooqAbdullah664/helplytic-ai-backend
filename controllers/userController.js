const User         = require('../models/User');
const Notification = require('../models/Notification');

// ── Get Profile ─────────────────────────────────────────────
const getProfile = async (req, res) => res.json(req.user);

// ── Update Profile ──────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, location, skills, interests, role } = req.body;
    const user = await User.findById(req.user._id);

    if (name)        user.name     = name.trim();
    if (location !== undefined) user.location = location;
    if (role && ['need_help', 'can_help', 'both'].includes(role)) user.role = role;

    if (skills !== undefined)
      user.skills = Array.isArray(skills)
        ? skills
        : skills.split(',').map(s => s.trim()).filter(Boolean);

    if (interests !== undefined)
      user.interests = Array.isArray(interests)
        ? interests
        : interests.split(',').map(s => s.trim()).filter(Boolean);

    await user.save();
    res.json(user);
  } catch (err) { next(err); }
};

// ── Leaderboard ─────────────────────────────────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('name avatar trustScore badges helpedCount solvedCount skills location')
      .sort({ trustScore: -1 })
      .limit(20)
      .lean();
    res.json(users);
  } catch (err) { next(err); }
};

// ── Notifications ───────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json(notifications);
  } catch (err) { next(err); }
};

const markNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile, getLeaderboard, getNotifications, markNotificationsRead };
