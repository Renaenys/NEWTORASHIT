// app/api/profile/route.js

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import { NextResponse } from "next/server";

// GET: Fetch (or create) the current user’s profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // find the user and their profile
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let profile = await UserProfile.findOne({ user: user._id });
  if (!profile) {
    // create a default profile if none exists
    profile = await UserProfile.create({
      user: user._id,
      name: user.name || "",
      phone: "",
      country: "",
      city: "",
      memberStatus: "none",
      memberExpire: null,
      tokenCredit: 0,
      smtpSetup: {},
      imapSetup: {},
    });
  }

  return NextResponse.json(profile);
}

// PUT: Update the current user’s profile
export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates = await request.json();
  await connectDB();

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await UserProfile.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        // Basic Info
        name: updates.name || "",
        phone: updates.phone || "",
        country: updates.country || "",
        city: updates.city || "",

        // SMTP settings
        "smtpSetup.host": updates.smtp?.host || "",
        "smtpSetup.port": updates.smtp?.port || null,
        "smtpSetup.user": updates.smtp?.user || "",
        "smtpSetup.pass": updates.smtp?.pass || "",

        // IMAP settings
        "imapSetup.host": updates.imap?.host || "",
        "imapSetup.port": updates.imap?.port || 993,
        "imapSetup.user": updates.imap?.user || "",
        "imapSetup.pass": updates.imap?.pass || "",
      },
    },
    { new: true, upsert: true }
  );

  return NextResponse.json(updated);
}
