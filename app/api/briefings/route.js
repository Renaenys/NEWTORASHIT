// app/api/briefings/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/dbConnect";
import Briefing from "@/models/Briefing";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  await connectDB();
  const all = await Briefing.find({ userId }).sort({ date: -1 }).lean();

  return NextResponse.json(all);
}
