// models/Forecast.js
import mongoose from "mongoose";

const ForecastSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  date: {
    type: String, // "YYYY-MM-DD"
    required: true,
  },
  location: String,
  latitude: Number,
  longitude: Number,
  current_weather: {
    temperature: Number,
    windspeed: Number,
    winddirection: Number,
    weathercode: Number,
    time: String,
  },
  daily: {
    time: [String],
    weathercode: [Number],
    temperature_2m_max: [Number],
    temperature_2m_min: [Number],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// only one forecast per user per day
ForecastSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Forecast ||
  mongoose.model("Forecast", ForecastSchema);
