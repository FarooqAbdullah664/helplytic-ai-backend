const mongoose = require('mongoose');
const requestSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true },
  category: { type: String, enum: ['tech','design','career','health','legal','finance','education','other'], default: 'other', index: true },
  tags: [{ type: String, lowercase: true }],
  urgency: { type: String, enum: ['low','medium','high'], default: 'medium', index: true },
  status: { type: String, enum: ['open','in_progress','solved'], default: 'open', index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  helpers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  aiSummary: { type: String, default: '' }, views: { type: Number, default: 0 },
}, { timestamps: true });
requestSchema.index({ title: 'text', description: 'text', tags: 'text' });
module.exports = mongoose.model('Request', requestSchema);
