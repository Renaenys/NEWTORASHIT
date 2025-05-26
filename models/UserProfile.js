import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  // ✅ Basic Profile
  name: { type: String, default: "" },
  phone: { type: String, default: "" },
  country: { type: String, default: "US" },
  city: { type: String, default: "Texas" },

  // ✅ Membership Info
  memberStatus: {
    type: String,
    enum: ["none", "trial", "member", "admin", "super"],
    default: "none",
  },
  memberExpire: { type: Date },
  tokenCredit: { type: Number, default: 0 },

  // ✅ SMTP Config
  smtpSetup: {
    host: { type: String, default: "" },
    port: { type: Number, default: null },
    user: { type: String, default: "" },
    pass: { type: String, default: "" },
  },

  // ✅ IMAP Config (new)
  imapSetup: {
    host: { type: String, default: "" },
    port: { type: Number, default: 993 }, // default IMAPS
    user: { type: String, default: "" },
    pass: { type: String, default: "" },
  },
});

export default mongoose.models.UserProfile ||
  mongoose.model("UserProfile", userProfileSchema);
