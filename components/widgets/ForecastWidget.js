// components/widgets/ForecastWidget.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import {
  WiDaySunny,
  WiCloud,
  WiRain,
  WiSnow,
  WiThunderstorm,
  WiFog,
} from "react-icons/wi";

export default function ForecastWidget() {
  const { status } = useSession();
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map Open-Meteo weather codes to icons
  function getIcon(code) {
    if (code === 0) return <WiDaySunny className="text-4xl" />;
    if ([1, 2, 3].includes(code)) return <WiCloud className="text-4xl" />;
    if ([45, 48].includes(code)) return <WiFog className="text-4xl" />;
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
      return <WiRain className="text-4xl" />;
    if ([71, 73, 75, 77, 85, 86].includes(code))
      return <WiSnow className="text-4xl" />;
    if ([95, 96, 99].includes(code))
      return <WiThunderstorm className="text-4xl" />;
    return <WiDaySunny className="text-4xl" />;
  }

  // Map codes to human-readable text
  function getDescription(code) {
    switch (code) {
      case 0:
        return "Clear";
      case 1:
        return "Mainly clear";
      case 2:
        return "Partly cloudy";
      case 3:
        return "Overcast";
      case 45:
      case 48:
        return "Fog";
      case 51:
      case 53:
      case 55:
        return "Drizzle";
      case 61:
      case 63:
      case 65:
        return "Rain";
      case 71:
      case 73:
      case 75:
        return "Snow";
      case 80:
      case 81:
      case 82:
        return "Showers";
      case 95:
        return "Thunderstorm";
      case 96:
      case 99:
        return "Storm & hail";
      default:
        return "Unknown";
    }
  }

  // fetch helper
  const load = async (refresh = false) => {
    setLoading(true);
    try {
      const method = refresh ? axios.post : axios.get;
      const res = await method("/api/forecast");
      setForecast(res.data);
    } catch (e) {
      console.error("Forecast load error:", e);
    } finally {
      setLoading(false);
    }
  };

  // initial load once authenticated
  useEffect(() => {
    if (status === "authenticated") {
      load();
    }
  }, [status]);

  if (loading) {
    return <div className="p-4">Loading weather…</div>;
  }
  if (!forecast) {
    return <div className="p-4">No forecast available.</div>;
  }

  // Build data for the next 3 days
  const days = [0, 1, 2].map((i) => ({
    date: forecast.time[i],
    code: forecast.weathercode[i],
    max: forecast.temperature_2m_max[i],
    min: forecast.temperature_2m_min[i],
  }));

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold dark:text-gray-50">
          📅 3-Day Forecast
        </h2>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="text-sm px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {days.map((d) => (
          <div key={d.date} className="text-center">
            <div className="font-medium dark:text-gray-100">{d.date}</div>
            <div className="my-2 flex justify-center">{getIcon(d.code)}</div>
            <div className="text-sm dark:text-gray-300">
              {getDescription(d.code)}
            </div>
            <div className="mt-1 text-sm">
              <span className="font-semibold">↑{d.max}°C</span>{" "}
              <span className="text-gray-500">↓{d.min}°C</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
