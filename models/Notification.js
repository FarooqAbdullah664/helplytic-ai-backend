const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['new_helper', 'request_solved', 'new_message', 'status', 'match', 'request', 'reputation', 'insight'],
    required: true,
  },
  message:        { type: String, required: true },
  relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', default: null },
  read:           { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
