const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true }, read: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('Message', messageSchema);
