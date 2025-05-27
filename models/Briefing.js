import mongoose from "mongoose";

const BriefingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  date: {
    type: String, // “YYYY-MM-DD”
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// one briefing per user per day
BriefingSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.Briefing ||
  mongoose.model("Briefing", BriefingSchema);
