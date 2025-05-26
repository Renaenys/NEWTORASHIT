// app/api/chatHistory/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/dbConnect";
import ChatHistory from "@/models/ChatHistory";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId query param is required" },
      { status: 400 }
    );
  }
  await connectDB();
  const chat = await ChatHistory.findOne({ sessionId });
  return NextResponse.json(chat?.messages || []);
}

export async function POST(request) {
  const { sessionId, messages } = await request.json();
  if (!sessionId || !messages?.length) {
    return NextResponse.json(
      { error: "sessionId and messages are required" },
      { status: 400 }
    );
  }

  await connectDB();
  let chat = await ChatHistory.findOne({ sessionId });
  if (chat) {
    chat.messages.push(...messages);
  } else {
    chat = new ChatHistory({ sessionId, messages });
    // set title to first user message (truncated)
    const first = messages.find((m) => m.role === "user");
    if (first) {
      chat.title = first.content.slice(0, 30) + "...";
    }
  }
  await chat.save();
  return NextResponse.json(chat.messages, { status: 201 });
}
