import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
}, { timestamps: true });

// Static method to create a default admin user if none exists
userSchema.statics.ensureDefaultAdmin = async function() {
  const User = this;
  const adminExists = await User.findOne({ username: 'pasu' });
  if (!adminExists) {
    await User.create({ username: 'pasu', password: '123', role: 'admin' });
    console.log('✅ Default admin user created: username=pasu, password=123');
  }
};

export default mongoose.model('User', userSchema); 