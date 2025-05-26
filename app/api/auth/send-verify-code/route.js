import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { email } = await req.json();
    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 15 * 60 * 1000; // 15 min

    user.verifyCode = code;
    user.verifyCodeExpiry = expiry;
    await user.save();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border-radius:8px;border:1px solid #eee;">
        <h2 style="color:#333">Email Verification</h2>
        <p>Hi,</p>
        <p>Use the 6-digit code below to verify your email address:</p>
        <div style="font-size:28px;font-weight:bold;background:#f9f9f9;padding:15px;text-align:center;margin:20px 0;border-radius:6px">${code}</div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;

    await transporter.sendMail({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: "Verify Your Email",
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send Verify Code Error:", err);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
