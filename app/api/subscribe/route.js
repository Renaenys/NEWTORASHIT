// app/api/subscribe/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/dbConnect";
import Subscription from "@/models/Subscription";

export async function POST(request) {
  const sub = await request.json();
  await connectDB();
  try {
    await Subscription.findOneAndUpdate(
      { endpoint: sub.endpoint },
      { keys: sub.keys },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
