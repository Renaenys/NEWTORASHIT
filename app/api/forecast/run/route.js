// app/api/forecast/run/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import Forecast from "@/models/Forecast";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import axios from "axios";

export async function POST() {
  // 1) Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  // 2) Connect DB
  await connectDB();

  // 3) Load user + profile
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const profile = await UserProfile.findOne({ user: user._id }).lean();
  if (!profile?.city || !profile?.country) {
    return NextResponse.json(
      { error: "Please set city & country in profile" },
      { status: 400 }
    );
  }

  // 4) Geocode via Nominatim
  const address = encodeURIComponent(`${profile.city}, ${profile.country}`);
  const geoRes = await axios.get(
    `https://nominatim.openstreetmap.org/search?format=json&q=${address}&limit=1`
  );
  if (!geoRes.data.length) {
    return NextResponse.json(
      { error: "Failed to geocode location" },
      { status: 500 }
    );
  }
  const { lat, lon, display_name } = geoRes.data[0];

  // 5) Fetch from open-meteo
  const weatherRes = await axios.get(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current_weather=true` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto`
  );

  // 6) Prepare upsert document
  const dateKey = new Date().toISOString().slice(0, 10);
  const doc = {
    userId: userEmail,
    date: dateKey,
    location: display_name,
    latitude: parseFloat(lat),
    longitude: parseFloat(lon),
    current_weather: weatherRes.data.current_weather,
    daily: weatherRes.data.daily,
  };

  // 7) Upsert by { userId, date }
  try {
    const saved = await Forecast.findOneAndUpdate(
      { userId: userEmail, date: dateKey },
      doc,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    return NextResponse.json(saved);
  } catch (err) {
    console.error("Forecast upsert error:", err);
    return NextResponse.json(
      { error: "Upsert failed", detail: err.message },
      { status: 500 }
    );
  }
}
