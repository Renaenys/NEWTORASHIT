// models/ChatHistory.js
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatHistorySchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  title: { type: String }, // ← new
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ChatHistory ||
  mongoose.model("ChatHistory", ChatHistorySchema);
