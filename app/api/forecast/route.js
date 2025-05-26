// app/api/forecast/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import Forecast from "@/models/Forecast";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  await connectDB();

  const todayKey = new Date().toISOString().slice(0, 10);
  const fc = await Forecast.findOne({
    userId: userEmail,
    date: todayKey,
  }).lean();

  if (!fc) {
    return NextResponse.json(
      { error: "Forecast not found for today" },
      { status: 404 }
    );
  }

  return NextResponse.json(fc);
}
