// app/api/weather/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import Forecast from "@/models/Forecast";
import axios from "axios";

async function getUser() {
  const session = await getServerSession(authOptions);
  if (!session) throw { status: 401, body: { error: "Unauthorized" } };
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) throw { status: 404, body: { error: "User not found" } };
  const profile = await UserProfile.findOne({ user: user._id });
  if (!profile) throw { status: 404, body: { error: "Profile not found" } };
  return { user, profile };
}

export async function GET() {
  try {
    const { user } = await getUser();
    const today = new Date().toISOString().slice(0, 10);
    const rec = await Forecast.findOne({ user: user._id, date: today });
    // return null if not yet fetched
    return NextResponse.json(rec ? rec.data : null);
  } catch (err) {
    return NextResponse.json(err.body || { error: "Server error" }, {
      status: err.status || 500,
    });
  }
}

export async function POST() {
  try {
    const { user, profile } = await getUser();
    const today = new Date().toISOString().slice(0, 10);

    // 1) Geocode
    const geoRes = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search` +
        `?name=${encodeURIComponent(profile.city)}` +
        `&country=${encodeURIComponent(profile.country)}` +
        `&count=1`
    );
    const loc = geoRes.data.results?.[0];
    if (!loc) throw new Error("Geocoding failed");

    // 2) Fetch 3-day forecast
    const wRes = await axios.get(
      `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
    );
    const daily = wRes.data.daily;
    if (!daily) throw new Error("No forecast data");

    // 3) Upsert into Mongo
    const rec = await Forecast.findOneAndUpdate(
      { user: user._id, date: today },
      {
        $set: { data: daily },
        $setOnInsert: { user: user._id, date: today },
      },
      { upsert: true, new: true }
    );

    // 4) Return the fresh data
    return NextResponse.json(rec.data);
  } catch (err) {
    console.error("POST /api/weather error:", err);
    const msg = err.body?.error || err.message || "Server error";
    const status = err.status || 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
