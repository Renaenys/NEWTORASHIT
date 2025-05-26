// app/api/email/delete/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import Email from "@/models/Email";
import { ImapFlow } from "imapflow";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uid: rawUid, mongoId } = await req.json();
  const uid = Number(rawUid);
  if (!uid || isNaN(uid)) {
    return NextResponse.json({ error: "Invalid UID" }, { status: 400 });
  }
  if (mongoId && !mongoose.isValidObjectId(mongoId)) {
    return NextResponse.json({ error: "Invalid mongoId" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const profile = await UserProfile.findOne({ user: user._id });
  if (
    !profile?.imapSetup?.host ||
    !profile.imapSetup.user ||
    !profile.imapSetup.pass ||
    !profile.imapSetup.port
  ) {
    return NextResponse.json({ error: "IMAP not configured" }, { status: 400 });
  }

  const client = new ImapFlow({
    host: profile.imapSetup.host.trim(),
    port: profile.imapSetup.port,
    secure: profile.imapSetup.port === 993,
    auth: {
      user: profile.imapSetup.user,
      pass: profile.imapSetup.pass,
    },
    logger: false,
  });

  try {
    await client.connect();

    // pull our stored mailbox
    const emailDoc = await Email.findOne({ user: user._id, uid });
    const mailboxPath = emailDoc?.mailbox || "INBOX";
    console.log("🗂  Opening mailbox:", mailboxPath);

    await client.mailboxOpen(mailboxPath);
    // 🔍 tell ImapFlow to return UIDs (not sequence numbers)
    const found = await client.search({ uid: [uid] }, { uid: true });
    console.log("🔍 [with uid:true] Search result for UID", uid, ":", found);

    if (!found.includes(uid)) {
      await client.logout();
      await Email.findByIdAndDelete(emailDoc?._id ?? mongoId);
      return NextResponse.json(
        { warning: `UID ${uid} not found on server; removed from DB only` },
        { status: 200 }
      );
    }

    // list all mailboxes and log them
    const boxes = await client.list();
    console.log(
      "📦 All mailboxes fetched:",
      boxes.map((b) => ({ path: b.path, specialUse: b.specialUse }))
    );

    // pick the Trash folder
    const trashFolder =
      boxes.find((b) => b.specialUse === "\\Trash")?.path || "Trash";
    console.log("🚮 Selected Trash folder:", trashFolder);

    // move the message by UID
    await client.mailboxOpen(mailboxPath);
    const moveRes = await client.messageMove(uid, trashFolder, { uid: true });
    console.log("📤 messageMove result:", moveRes);

    if (!moveRes.uidMap || !moveRes.uidMap.size) {
      throw new Error("IMAP move failed: no entries in uidMap");
    }

    await Email.findByIdAndDelete(emailDoc._id);
    await client.logout();

    return NextResponse.json(
      {
        success: true,
        message: `Moved UID ${uid} → ${trashFolder} & deleted from DB`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Delete failed:", err);
    try {
      await client.logout();
    } catch {}
    return NextResponse.json(
      { error: err.message || "Failed to delete email" },
      { status: 500 }
    );
  }
}
