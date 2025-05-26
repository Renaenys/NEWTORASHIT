// app/api/briefings/run/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import Briefing from "@/models/Briefing";
import Event from "@/models/Event";
import Meeting from "@/models/Meeting";
import Task from "@/models/Task";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import { parseISO, isToday } from "date-fns";

export async function POST() {
  // 1) authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  // 2) connect
  await connectDB();

  // 3) find the user + their profile
  const userDoc = await User.findOne({ email: userEmail });
  if (!userDoc) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 4) load all of this user’s events, meetings, tasks directly from Mongo
  const [allEvents, allMeetings, allTasks] = await Promise.all([
    Event.find({ createdBy: userDoc._id }),
    Meeting.find({ createdBy: userDoc._id }),
    Task.find({
      /* your Task model doesn’t have createdBy? if it does, use it; 
                      else you can skip and treat all tasks as global or store an owner */
    }),
  ]);

  // 5) filter to “today”
  const todayKey = new Date().toISOString().slice(0, 10);
  const evts = allEvents.filter((e) => isToday(parseISO(e.start)));
  const mts = allMeetings.filter((m) => isToday(parseISO(m.date)));
  const tks = allTasks.filter((t) => {
    const dt = t.dueDate ? parseISO(t.dueDate) : parseISO(t.createdAt);
    return isToday(dt);
  });

  // 6) build your summary
  const content = `
Events: ${evts.map((e) => e.title).join(", ") || "none"}.
Meetings: ${mts.map((m) => m.title).join(", ") || "none"}.
Tasks: ${tks.map((t) => t.title).join(", ") || "none"}.
`;

  // 7) upsert into briefings
  try {
    const doc = { userId: userEmail, date: todayKey, content };
    const saved = await Briefing.findOneAndUpdate(
      { userId: userEmail, date: todayKey },
      doc,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json(saved);
  } catch (err) {
    console.error("Briefing upsert error:", err);
    return NextResponse.json(
      { error: "Upsert failed", detail: err.message },
      { status: 500 }
    );
  }
}
