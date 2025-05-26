// components/widgets/WeatherWidget.jsx
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FiSun,
  FiCloud,
  FiCloudRain,
  FiWind,
  FiClock,
  FiRefreshCw,
} from "react-icons/fi";
import Swal from "sweetalert2";

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Map Open-Meteo weathercode to icon + label
  const codeMap = {
    0: { icon: <FiSun />, label: "Clear" },
    1: { icon: <FiCloud />, label: "Mainly Clear" },
    2: { icon: <FiCloud />, label: "Partly Cloudy" },
    3: { icon: <FiCloud />, label: "Overcast" },
    61: { icon: <FiCloudRain />, label: "Rain" },
    // …add more codes as needed
  };

  const fetchWeather = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/weather");
      setWeather(res.data);
    } catch (err) {
      console.error("WeatherWidget error:", err);
      const msg =
        err.response?.data?.error || err.message || "Unable to load weather";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
        Loading weather…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900 rounded-lg shadow p-4 text-red-600">
        {error}
        <button
          onClick={fetchWeather}
          className="ml-2 text-red-800 dark:text-red-200 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { location, temperature, windspeed, weathercode, time } = weather;
  const { icon, label } = codeMap[weathercode] || {
    icon: <FiCloud />,
    label: "Unknown",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
      <div className="self-end">
        <button
          onClick={fetchWeather}
          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="Refresh weather"
        >
          <FiRefreshCw size={18} />
        </button>
      </div>
      <h3 className="text-lg font-semibold dark:text-white mb-2">🌤️ Weather</h3>
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold dark:text-white">
          {Math.round(temperature)}°C
        </span>
      </div>
      <div className="text-sm dark:text-gray-300 mb-2">{label}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
        <FiWind /> <span>{Math.round(windspeed)} km/h</span>
      </div>
      <div className="mt-2 text-xs text-gray-400 flex items-center space-x-1">
        <FiClock /> <span>{new Date(time).toLocaleTimeString()}</span>
      </div>
      <div className="mt-1 text-sm dark:text-gray-200">📍 {location}</div>
    </div>
  );
}
