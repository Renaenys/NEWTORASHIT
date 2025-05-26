// app/api/email/send/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import nodemailer from "nodemailer";

// Turn off Next.js JSON parser so we can handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  // 1️⃣ Auth
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2️⃣ Parse multipart/form-data
  const formData = await req.formData();
  const to = formData.get("to");
  const subject = formData.get("subject");
  const body = formData.get("body");
  const files = formData.getAll("attachments"); // array of File objects

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // 3️⃣ Load user & SMTP config
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    const profile = await UserProfile.findOne({ user: user._id });
    if (
      !profile?.smtpSetup?.host ||
      !profile.smtpSetup.user ||
      !profile.smtpSetup.pass ||
      !profile.smtpSetup.port
    ) {
      return NextResponse.json(
        { error: "SMTP not configured" },
        { status: 400 }
      );
    }

    // 4️⃣ Build transporter
    const transporter = nodemailer.createTransport({
      host: profile.smtpSetup.host.trim(),
      port: Number(profile.smtpSetup.port),
      secure: Number(profile.smtpSetup.port) === 465,
      auth: {
        user: profile.smtpSetup.user,
        pass: profile.smtpSetup.pass,
      },
    });

    // 5️⃣ Format HTML body
    const formattedBody = body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => `<p>${line}</p>`)
      .join("");

    // 6️⃣ Convert uploads into Nodemailer attachments
    const mailAttachments = [];
    for (const file of files) {
      // only handle real File instances
      if (!(file instanceof File)) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      mailAttachments.push({
        filename: file.name,
        content: buffer,
        contentType: file.type,
      });
    }

    // 7️⃣ Send
    await transporter.sendMail({
      from: `"${profile.name || "Tora Mailer"}" <${profile.smtpSetup.user}>`,
      to,
      subject,
      html: formattedBody,
      attachments: mailAttachments,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Send Email Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
