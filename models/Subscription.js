import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
});

export default mongoose.models.Subscription ||
  mongoose.model("Subscription", SubscriptionSchema);
