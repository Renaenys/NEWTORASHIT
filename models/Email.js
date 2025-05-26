// models/Email.js
import mongoose from "mongoose";

const emailSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uid: { type: Number, required: true },
    mailbox: { type: String, required: true }, // ← NEW
    subject: { type: String },
    from: { type: String },
    date: { type: Date },
    seen: { type: Boolean, default: false },
    html: { type: String },
    text: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Email || mongoose.model("Email", emailSchema);
