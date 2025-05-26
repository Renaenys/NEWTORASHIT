// app/api/email/live/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import Email from "@/models/Email";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const profile = await UserProfile.findOne({ user: user._id });
  if (!profile?.imapSetup?.host) {
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

    // ✨ Capture the mailbox object, not just its path
    const mailbox = await client.mailboxOpen("INBOX");
    const mailboxPath = mailbox.path;
    const total = mailbox.exists;
    const startUID = Math.max(total - 49, 1); // last 50 emails

    for await (let msg of client.fetch(`${startUID}:*`, {
      uid: true,
      envelope: true,
      flags: true,
      internalDate: true,
      source: true,
    })) {
      const parsed = await simpleParser(msg.source);

      // Find existing email in Mongo
      const existing = await Email.findOne({ user: user._id, uid: msg.uid });

      // Determine seen status
      const localSeen = existing?.seen ?? false;
      const imapSeen = Array.isArray(msg.flags) && msg.flags.includes("\\Seen");
      const seenFinal = localSeen || imapSeen;

      const doc = {
        user: user._id,
        uid: msg.uid,
        mailbox: mailboxPath, // ← record the folder
        subject: parsed.subject || "(No subject)",
        from: parsed.from?.text || "Unknown",
        html: parsed.html || "",
        text: parsed.text || "",
        date: parsed.date || msg.internalDate || new Date(),
        seen: seenFinal,
      };

      if (existing) {
        await Email.updateOne({ _id: existing._id }, { $set: doc });
      } else {
        await Email.create(doc);
      }
    }

    await client.logout();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ IMAP sync failed:", err);
    try {
      await client.logout();
    } catch {}
    return NextResponse.json(
      { error: err.message || "IMAP sync error" },
      { status: 500 }
    );
  }
}
