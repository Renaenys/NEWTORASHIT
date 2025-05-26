// app/api/weather/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";

export async function GET(request) {
  // require authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  // find user's profile
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const profile = await UserProfile.findOne({ user: user._id });
  const { country, city } = profile || {};

  if (!country || !city) {
    return NextResponse.json(
      { error: "Please set country & city in your profile first" },
      { status: 400 }
    );
  }

  // 1. Geocode city/country → lat/lon
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&country=${encodeURIComponent(country)}&count=1`
  );
  const geoData = await geoRes.json();
  if (!geoData.results?.length) {
    return NextResponse.json(
      { error: "Unable to geocode your city" },
      { status: 400 }
    );
  }
  const { latitude, longitude, name } = geoData.results[0];

  // 2. Fetch current weather
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current_weather=true&timezone=auto`
  );
  const weatherData = await weatherRes.json();
  if (!weatherData.current_weather) {
    return NextResponse.json(
      { error: "Unable to fetch weather" },
      { status: 500 }
    );
  }

  // return a concise payload
  return NextResponse.json({
    location: name,
    temperature: weatherData.current_weather.temperature,
    windspeed: weatherData.current_weather.windspeed,
    weathercode: weatherData.current_weather.weathercode,
    time: weatherData.current_weather.time,
  });
}
