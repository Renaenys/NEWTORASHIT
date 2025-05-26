import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  emailVerified: Date,
  
  verifyCode: String,
  verifyCodeExpiry: Date,
  resetToken: String,
  resetTokenExpiry: Date,
});

export default mongoose.models.User || mongoose.model("User", userSchema);
