import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import { simpleParser } from "mailparser";
import { ImapFlow } from "imapflow";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { uid } = await req.json();
  if (!uid || isNaN(uid))
    return Response.json({ error: "Invalid UID" }, { status: 400 });

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  const profile = await UserProfile.findOne({ user: user._id });

  const client = new ImapFlow({
    host: profile.imapSetup.host.trim(),
    port: profile.imapSetup.port,
    secure: profile.imapSetup.port === 993,
    auth: {
      user: profile.imapSetup.user,
      pass: profile.imapSetup.pass,
    },
  });

  try {
    await client.connect();
    let lock = await client.getMailboxLock("INBOX");

    let msgData = null;
    for await (let msg of client.fetch(
      { uid: Number(uid) },
      { source: true, flags: true }
    )) {
      const parsed = await simpleParser(msg.source);
      msgData = {
        uid: msg.uid,
        subject: parsed.subject || "(No subject)",
        from: parsed.from?.text || "Unknown",
        html: parsed.html || "",
        text: parsed.text || "",
        date: parsed.date || new Date(),
        seen: Array.isArray(msg.flags) && msg.flags.includes("\\Seen"),
      };
    }

    lock.release();
    await client.logout();

    if (!msgData) {
      return Response.json({ error: "Email not found" }, { status: 404 });
    }

    return Response.json(msgData);
  } catch (err) {
    console.error("❌ Email detail fetch error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
