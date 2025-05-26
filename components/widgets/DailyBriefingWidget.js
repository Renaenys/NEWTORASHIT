// components/widgets/DailyBriefingWidget.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { FiRefreshCw } from "react-icons/fi";
import Swal from "sweetalert2";
import { format } from "date-fns";

const weatherEmoji = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  71: "❄️",
  73: "❄️",
  75: "❄️",
  80: "🌦️",
  81: "🌧️",
  82: "⛈️",
  95: "⛈️",
  96: "⛈️",
  99: "🌩️",
};

export default function DailyBriefingWidget() {
  const [forecast, setForecast] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayKey = new Date().toISOString().slice(0, 10);

  // GET-only loaders
  async function fetchForecast() {
    try {
      const resp = await axios.get("/api/forecast");
      return resp.data;
    } catch (err) {
      // if 404, user simply hasn't run it yet
      if (err.response?.status === 404) {
        return null;
      }
      console.error("Forecast fetch error:", err);
      return null;
    }
  }
  async function fetchBriefing() {
    try {
      const { data: briefs } = await axios.get("/api/briefings");
      const today = briefs.find((b) => b.date === todayKey);
      return today ? today.content : null;
    } catch {
      return null;
    }
  }

  // core GET
  async function loadLocalData() {
    setLoading(true);
    try {
      const [fc, br] = await Promise.all([fetchForecast(), fetchBriefing()]);
      setForecast(fc);
      setBriefing(br);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Could not load data", "error");
    } finally {
      setLoading(false);
    }
  }

  // manual refresh: RUN then GET
  async function handleRefresh() {
    setLoading(true);
    try {
      // regenerate data
      await axios.post("/api/forecast/run");
      await axios.post("/api/briefings/run");
      // then re-fetch
      await loadLocalData();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Refresh failed", "error");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocalData();
  }, []);

  const today = format(new Date(), "MMMM d, yyyy");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {forecast ? (
            <>
              <div className="text-4xl">
                {weatherEmoji[forecast.current_weather.weathercode] || "❔"}
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {Math.round(forecast.current_weather.temperature)}°C
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {forecast.location}
                </div>
              </div>
            </>
          ) : (
            <div className="italic text-gray-500 dark:text-gray-400">
              No weather data yet.
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={`p-1 rounded ${
            loading
              ? "text-gray-400"
              : "text-indigo-500 hover:bg-indigo-100 dark:hover:bg-gray-700"
          }`}
        >
          <FiRefreshCw size={20} />
        </button>
      </div>

      {/* Briefing */}
      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
        <strong>Morning briefing for {today}:</strong>
        <br />
        {loading ? (
          "Loading…"
        ) : briefing ? (
          briefing
        ) : (
          <span className="italic">No briefing available.</span>
        )}
      </div>
    </div>
  );
}
