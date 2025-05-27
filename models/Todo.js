// models/Todo.js
import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// each user+title can repeat, so no unique index needed
export default mongoose.models.Todo || mongoose.model("Todo", todoSchema);
