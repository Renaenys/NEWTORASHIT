// models/Meeting.js
import mongoose from "mongoose";

const MeetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  agenda: { type: String },
  participants: [{ type: String }], // e.g. emails or user IDs
  date: { type: Date, required: true },
  location: { type: String },
  createdAt: { type: Date, default: Date.now },

  // ← Tie to the creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

export default mongoose.models.Meeting ||
  mongoose.model("Meeting", MeetingSchema);
