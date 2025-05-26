// app/api/email/mark-read/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import Email from "@/models/Email";

export async function POST(req) {
  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse & validate UID
  const { uid: rawUid } = await req.json();
  if (!rawUid) {
    return NextResponse.json({ error: "Missing UID" }, { status: 400 });
  }
  const uid = Number(rawUid);
  if (isNaN(uid)) {
    return NextResponse.json({ error: "Invalid UID" }, { status: 400 });
  }

  // 3. Connect to DB & find user
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    console.log(`📝 Marking email UID=${uid} as read for user ${user.email}`);

    // 4. Update only the 'seen' flag
    const result = await Email.updateOne(
      { user: user._id, uid },
      { $set: { seen: true } }
    );
    console.log("🛠️ Update result:", result);

    if (result.matchedCount === 0) {
      // no document found with that uid
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Mark Read failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to mark read" },
      { status: 500 }
    );
  }
}
