// models/Briefing.js
import mongoose from "mongoose";

const BriefingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// only one briefing per user per day
BriefingSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Briefing ||
  mongoose.model("Briefing", BriefingSchema);
