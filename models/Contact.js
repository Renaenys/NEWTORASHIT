import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Contact ||
  mongoose.model("Contact", ContactSchema);
