const Message      = require('../models/Message');
const Notification = require('../models/Notification');

const getChatId = (id1, id2) => [String(id1), String(id2)].sort().join('_');

// ── Send Message ────────────────────────────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content?.trim())
      return res.status(400).json({ message: 'receiverId and content are required' });

    const chatId  = getChatId(req.user._id, receiverId);
    const message = await Message.create({
      chatId,
      sender:   req.user._id,
      receiver: receiverId,
      content:  content.trim(),
    });

    const populated = await message.populate('sender', 'name avatar');

    // Real-time via socket
    const io          = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    if (io && onlineUsers) {
      const socketId = onlineUsers[String(receiverId)];
      if (socketId) io.to(socketId).emit('receive_message', populated);
    }

    // Notification
    const notif = await Notification.create({
      recipient: receiverId,
      type:      'new_message',
      message:   `${req.user.name} sent you a message`,
    });
    if (io && onlineUsers) {
      const socketId = onlineUsers[String(receiverId)];
      if (socketId) io.to(socketId).emit('new_notification', notif);
    }

    res.status(201).json(populated);
  } catch (err) { next(err); }
};

// ── Get Messages ────────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 })
      .lean();

    // Mark as read
    await Message.updateMany(
      { chatId: req.params.chatId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) { next(err); }
};

module.exports = { sendMessage, getMessages };
