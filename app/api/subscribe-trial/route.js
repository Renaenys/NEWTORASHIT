// app/api/subscribe-trial/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import { NextResponse } from "next/server";

export async function POST() {
  // 1) auth
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 2) see if they already have an unexpired trial
  const existing = await UserProfile.findOne({ user: user._id });
  const now = new Date();
  if (
    existing?.memberStatus === "trial" &&
    existing.memberExpire &&
    existing.memberExpire > now
  ) {
    return NextResponse.json(
      { error: "You already have an active trial." },
      { status: 400 }
    );
  }

  // 3) grant new trial, set dummy country/city so weather won't 400
  const expire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const profile = await UserProfile.findOneAndUpdate(
    { user: user._id },
    {
      memberStatus: "trial",
      memberExpire: expire,
      // dummy placeholders:
      country: existing?.country || "US",
      city: existing?.city || "New York",
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ success: true, profile });
}
