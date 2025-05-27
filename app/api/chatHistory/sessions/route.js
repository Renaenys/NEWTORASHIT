import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import ChatHistory from "@/models/ChatHistory";

async function getUserOrThrow() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new NextResponse("Unauthorized", { status: 401 });
  }
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    throw new NextResponse("User not found", { status: 404 });
  }
  return user;
}

export async function GET() {
  const user = await getUserOrThrow();
  const list = await ChatHistory.find(
    { user: user._id },
    "sessionId title createdAt"
  ).sort({ createdAt: -1 });
  return NextResponse.json(list);
}

export async function DELETE(request) {
  const user = await getUserOrThrow();
  const url = new URL(request.url);
  const sid = url.searchParams.get("sessionId");
  if (!sid) {
    return NextResponse.json(
      { error: "sessionId query param is required" },
      { status: 400 }
    );
  }

  await ChatHistory.deleteOne({
    user: user._id,
    sessionId: sid,
  });
  return NextResponse.json({ success: true });
}
