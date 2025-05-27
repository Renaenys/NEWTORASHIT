// app/api/forecast/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import Forecast from "@/models/Forecast";
import axios from "axios";

// 1️⃣ Helper: get the current user's profile
async function getProfileBySession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profile = await UserProfile.findOne({ user: user._id });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return profile;
}

// 2️⃣ Helper: geocode city → { latitude, longitude }
async function geocodeCity(city) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(city)}&count=1`;
  const res = await axios.get(url);
  if (!res.data.results?.length) {
    throw new Error(`Geocoding failed for city: ${city}`);
  }
  return res.data.results[0];
}

// 3️⃣ Helper: fetch daily forecast data from Open-Meteo
async function fetchDailyForecast(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
    `&timezone=auto`;
  const res = await axios.get(url);
  if (!res.data.daily) {
    throw new Error("No daily data from weather API");
  }
  return res.data.daily;
}

// ─── GET: fetch-or-cache today’s forecast ─────────────────────
export async function GET(request) {
  const profile = await getProfileBySession();
  // if getProfileBySession returned a NextResponse, just return it
  if (profile instanceof NextResponse) return profile;

  const userId = profile.user;
  const today = new Date().toISOString().slice(0, 10);

  await connectDB();
  let record = await Forecast.findOne({ user: userId, date: today });

  if (!record) {
    try {
      const loc = await geocodeCity(profile.city);
      const daily = await fetchDailyForecast(loc.latitude, loc.longitude);
      record = await Forecast.create({
        user: userId,
        date: today,
        data: daily,
      });
    } catch (e) {
      console.error("Forecast GET error:", e);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json(record.data);
}

// ─── POST: force-refresh today’s forecast ────────────────────
export async function POST(request) {
  const profile = await getProfileBySession();
  if (profile instanceof NextResponse) return profile;

  const userId = profile.user;
  const today = new Date().toISOString().slice(0, 10);

  await connectDB();
  try {
    const loc = await geocodeCity(profile.city);
    const daily = await fetchDailyForecast(loc.latitude, loc.longitude);
    const updated = await Forecast.findOneAndUpdate(
      { user: userId, date: today },
      { data: daily },
      { upsert: true, new: true }
    );
    return NextResponse.json(updated.data);
  } catch (e) {
    console.error("Forecast POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
