import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
  },
  title: { type: String },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
});

// compound unique: one (user,sessionId) per document
ChatHistorySchema.index({ user: 1, sessionId: 1 }, { unique: true });

export default mongoose.models.ChatHistory ||
  mongoose.model("ChatHistory", ChatHistorySchema);
