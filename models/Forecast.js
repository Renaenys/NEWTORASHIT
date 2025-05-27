import mongoose from "mongoose";

const ForecastSchema = new mongoose.Schema({
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
  data: {
    // the raw `daily` object from Open-Meteo
    type: Object,
    required: true,
  },
});

// one forecast per user per date
ForecastSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.Forecast ||
  mongoose.model("Forecast", ForecastSchema);
