import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  createdAt: Date
});

export default mongoose.model('User', UserSchema); 