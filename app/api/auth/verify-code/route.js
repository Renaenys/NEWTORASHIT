import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { email, code } = await req.json();
    await connectDB();

    const user = await User.findOne({ email });
    if (
      !user ||
      user.verifyCode !== code ||
      Date.now() > user.verifyCodeExpiry
    ) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 400 }
      );
    }

    user.emailVerified = new Date();
    user.verifyCode = undefined;
    user.verifyCodeExpiry = undefined;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify Code Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
