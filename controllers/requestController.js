const Request      = require('../models/Request');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const { detectCategory, extractTags, detectUrgency, improveText, generateSummary } = require('../utils/aiEngine');
const { getSuggestions } = require('../utils/geminiAI');

// helper: emit socket notification
const emitNotification = (req, recipientId, notification) => {
  const io          = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers');
  if (io && onlineUsers) {
    const socketId = onlineUsers[String(recipientId)];
    if (socketId) io.to(socketId).emit('new_notification', notification);
  }
};

// ── Create Request ──────────────────────────────────────────
const createRequest = async (req, res, next) => {
  try {
    let { title, description, category, tags, urgency } = req.body;

    if (!title || !description)
      return res.status(400).json({ message: 'Title and description are required' });

    // Try Gemini AI first, fallback to local engine
    let aiSummary;
    try {
      if (process.env.GEMINI_API_KEY) {
        const aiResult = await getSuggestions(title, description);
        if (!category || category === 'other') category = aiResult.category || detectCategory(title + ' ' + description);
        if (!tags || tags.length === 0)        tags     = aiResult.tags?.length ? aiResult.tags : extractTags(description);
        if (!urgency)                          urgency  = aiResult.urgency || detectUrgency(description);
        if (aiResult.rewrite)                  description = aiResult.rewrite;
        aiSummary = aiResult.aiSummary || generateSummary(title, description);
      } else {
        throw new Error('No Gemini key');
      }
    } catch (aiErr) {
      console.error('Gemini fallback to local engine:', aiErr.message);
      description = improveText(description);
      if (!category || category === 'other') category = detectCategory(title + ' ' + description);
      if (!tags || tags.length === 0)        tags     = extractTags(description);
      if (!urgency)                          urgency  = detectUrgency(description);
      aiSummary = generateSummary(title, description);
    }

    const request = await Request.create({
      title, description, category, tags, urgency, aiSummary,
      author: req.user._id,
    });

    res.status(201).json(request);
  } catch (err) { next(err); }
};

// ── Get All Requests ────────────────────────────────────────
const getRequests = async (req, res, next) => {
  try {
    const { category, urgency, status, search, author, page = 1, limit = 10 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (urgency)  query.urgency  = urgency;
    if (status)   query.status   = status;
    if (author)   query.author   = author;
    if (search)   query.$text    = { $search: search };

    const [requests, total] = await Promise.all([
      Request.find(query)
        .populate('author', 'name avatar trustScore location')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Request.countDocuments(query),
    ]);

    res.json({ requests, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// ── Get Single Request ──────────────────────────────────────
const getRequestById = async (req, res, next) => {
  try {
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate('author',  'name avatar trustScore badges location skills')
      .populate('helpers', 'name avatar trustScore skills');

    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (err) { next(err); }
};

// ── Offer Help ──────────────────────────────────────────────
const offerHelp = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (String(request.author) === String(req.user._id))
      return res.status(400).json({ message: 'You cannot help your own request' });

    if (request.helpers.map(String).includes(String(req.user._id)))
      return res.status(400).json({ message: 'Already offering help' });

    request.helpers.push(req.user._id);
    if (request.status === 'open') request.status = 'in_progress';
    await request.save();

    // Trust score + count
    await User.findByIdAndUpdate(req.user._id, { $inc: { trustScore: 5, helpedCount: 1 } });
    await User.recalcBadges(req.user._id);

    // Notification
    const notif = await Notification.create({
      recipient:      request.author,
      type:           'new_helper',
      message:        `${req.user.name} offered to help with "${request.title}"`,
      relatedRequest: request._id,
    });
    emitNotification(req, request.author, notif);

    const populated = await request.populate('helpers', 'name avatar trustScore skills');
    res.json({ message: 'You are now helping', request: populated });
  } catch (err) { next(err); }
};

// ── Solve Request ───────────────────────────────────────────
const solveRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Not found' });

    if (String(request.author) !== String(req.user._id))
      return res.status(403).json({ message: 'Only the author can mark as solved' });

    request.status     = 'solved';
    request.resolvedBy = req.body.resolvedBy || null;
    await request.save();

    // Trust score
    await User.findByIdAndUpdate(req.user._id, { $inc: { trustScore: 10, solvedCount: 1 } });
    await User.recalcBadges(req.user._id);

    // Notify all helpers
    for (const helperId of request.helpers) {
      const notif = await Notification.create({
        recipient:      helperId,
        type:           'request_solved',
        message:        `"${request.title}" has been marked as solved!`,
        relatedRequest: request._id,
      });
      emitNotification(req, helperId, notif);
    }

    res.json({ message: 'Request marked as solved', request });
  } catch (err) { next(err); }
};

module.exports = { createRequest, getRequests, getRequestById, offerHelp, solveRequest };
