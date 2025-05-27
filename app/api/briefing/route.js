import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import Event from "@/models/Event";
import Meeting from "@/models/Meeting";
import Todo from "@/models/Todo";
import WeatherForecast from "@/models/WeatherForecast";
import Briefing from "@/models/Briefing";
import axios from "axios";

// helper to get authenticated user + profile
async function getProfile() {
  const sess = await getServerSession(authOptions);
  if (!sess) throw new NextResponse("Unauthorized", { status: 401 });
  await connectDB();
  const user = await User.findOne({ email: sess.user.email });
  if (!user) throw new NextResponse("User not found", { status: 404 });
  const profile = await UserProfile.findOne({ user: user._id });
  if (!profile) throw new NextResponse("Profile not found", { status: 404 });
  return { user, profile };
}

// helper to call OpenAI
async function summarizeWithAI(prompt) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a personal assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data.choices[0].message.content;
}

// ─── GET: return today's briefing ────────────────────────
export async function GET(request) {
  let up;
  try {
    up = await getProfile();
  } catch (resp) {
    return resp;
  }
  const { user } = up;
  const today = new Date().toISOString().slice(0, 10);

  await connectDB();
  const b = await Briefing.findOne({ user: user._id, date: today });
  if (!b) {
    return NextResponse.json({ summary: null });
  }
  return NextResponse.json({ summary: b.summary });
}

// ─── POST: generate & store today's briefing ────────────
export async function POST(request) {
  let up;
  try {
    up = await getProfile();
  } catch (resp) {
    return resp;
  }
  const { user, profile } = up;
  const today = new Date().toISOString().slice(0, 10);

  await connectDB();

  // 1️⃣ Gather data
  const [events, meetings, todos, weather] = await Promise.all([
    Event.find({
      createdBy: user._id,
      start: {
        $gte: new Date(`${today}T00:00:00`),
        $lt: new Date(`${today}T23:59:59`),
      },
    }),
    Meeting.find({
      createdBy: user._id,
      date: {
        $gte: new Date(`${today}T00:00:00`),
        $lt: new Date(`${today}T23:59:59`),
      },
    }),
    Todo.find({ user: user._id, done: false }),
    WeatherForecast.findOne({ user: user._id, date: today }),
  ]);

  // 2️⃣ Build prompt
  let prompt = `Good morning ${profile.name || ""}!\n\n`;
  if (weather) {
    prompt += `Weather today (${weather.location}): temp ${weather.temperature}°C, wind ${weather.windspeed} m/s.\n\n`;
  }
  if (meetings.length) {
    prompt +=
      "Meetings:\n" +
      meetings
        .map((m) => `- ${m.title} at ${new Date(m.date).toLocaleTimeString()}`)
        .join("\n") +
      "\n\n";
  }
  if (events.length) {
    prompt +=
      "Events:\n" +
      events
        .map((e) => `- ${e.title} at ${new Date(e.start).toLocaleTimeString()}`)
        .join("\n") +
      "\n\n";
  }
  if (todos.length) {
    prompt +=
      "To-Dos:\n" + todos.map((t) => `- ${t.title}`).join("\n") + "\n\n";
  }
  prompt += "Please give me a concise daily briefing.";

  // 3️⃣ Summarize
  let summary;
  try {
    summary = await summarizeWithAI(prompt);
  } catch (e) {
    console.error("AI summarization error:", e);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }

  // 4️⃣ Upsert into DB
  const rec = await Briefing.findOneAndUpdate(
    { user: user._id, date: today },
    { summary },
    { upsert: true, new: true }
  );

  return NextResponse.json({ summary: rec.summary });
}
