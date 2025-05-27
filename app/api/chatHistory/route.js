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

export async function GET(request) {
  const user = await getUserOrThrow();
  const url = new URL(request.url);
  const sid = url.searchParams.get("sessionId");
  if (!sid) {
    return NextResponse.json(
      { error: "sessionId query param is required" },
      { status: 400 }
    );
  }

  const chat = await ChatHistory.findOne({
    user: user._id,
    sessionId: sid,
  });
  return NextResponse.json(chat?.messages || []);
}

export async function POST(request) {
  const user = await getUserOrThrow();
  const { sessionId, messages } = await request.json();
  if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "sessionId and non-empty messages array required" },
      { status: 400 }
    );
  }

  let chat = await ChatHistory.findOne({
    user: user._id,
    sessionId,
  });

  if (chat) {
    chat.messages.push(...messages);
  } else {
    // create new chat belonging to this user
    const titleMsg = messages.find((m) => m.role === "user")?.content || "";
    chat = new ChatHistory({
      user: user._id,
      sessionId,
      title: titleMsg.substring(0, 30) + "...",
      messages,
    });
  }

  await chat.save();
  return NextResponse.json(chat.messages, { status: 201 });
}
