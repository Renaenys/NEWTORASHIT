// app/api/chatHistory/sessions/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/dbConnect";
import ChatHistory from "@/models/ChatHistory";

export async function GET() {
  await connectDB();
  // return sessionId + title + createdAt
  const all = await ChatHistory.find({}, "sessionId title createdAt").sort({
    createdAt: -1,
  });
  return NextResponse.json(all);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }
  await connectDB();
  await ChatHistory.deleteOne({ sessionId });
  return NextResponse.json({ success: true });
}
