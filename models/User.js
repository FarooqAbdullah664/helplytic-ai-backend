const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true, index: true },
  password:    { type: String, required: true, minlength: 6 },
  role:        { type: String, enum: ['need_help', 'can_help', 'both'], default: 'both' },
  skills:      [{ type: String, trim: true }],
  interests:   [{ type: String, trim: true }],
  location:    { type: String, default: '' },
  bio:         { type: String, default: '' },
  avatar:      { type: String, default: '' },
  trustScore:  { type: Number, default: 0, min: 0 },
  helpedCount: { type: Number, default: 0, min: 0 },
  solvedCount: { type: Number, default: 0, min: 0 },
  badges:      [{ type: String }],
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Auto-update badges when trustScore changes
userSchema.pre('save', function (next) {
  const s = this.trustScore;
  const badges = [];
  if (s >= 10)  badges.push('Helper');
  if (s >= 25)  badges.push('Contributor');
  if (s >= 50)  badges.push('Expert');
  if (s >= 100) badges.push('Champion');
  this.badges = badges;
  next();
});

// Static helper to recalculate badges after findByIdAndUpdate
userSchema.statics.recalcBadges = async function(userId) {
  const user = await this.findById(userId);
  if (!user) return;
  const s = user.trustScore;
  const badges = [];
  if (s >= 10)  badges.push('Helper');
  if (s >= 25)  badges.push('Contributor');
  if (s >= 50)  badges.push('Expert');
  if (s >= 100) badges.push('Champion');
  await this.findByIdAndUpdate(userId, { badges });
};

userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
