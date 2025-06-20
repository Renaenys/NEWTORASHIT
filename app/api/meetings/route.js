// app/api/meetings/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import Meeting from "@/models/Meeting";
import User from "@/models/User";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  const meetings = await Meeting.find({ createdBy: user._id }).sort({
    date: -1,
  });
  return NextResponse.json(meetings);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  const data = await request.json();
  const meeting = await Meeting.create({ ...data, createdBy: user._id });
  return NextResponse.json(meeting, { status: 201 });
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id, ...data } = await request.json();
  if (!id)
    return NextResponse.json({ error: "No ID provided" }, { status: 400 });

  const updates = {};
  if (data.title) updates.title = data.title;
  if (data.agenda) updates.agenda = data.agenda;
  if (data.participants) updates.participants = data.participants;
  if (data.date) updates.date = new Date(data.date);
  if (data.location) updates.location = data.location;

  try {
    const meeting = await Meeting.findOneAndUpdate(
      {
        _id: id,
        createdBy: (await User.findOne({ email: session.user.email }))._id,
      },
      updates,
      { new: true }
    );
    if (!meeting)
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    return NextResponse.json(meeting, { status: 200 });
  } catch (error) {
    console.error("PUT /api/meetings error:", error);
    return NextResponse.json(
      { error: "Failed to update meeting" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "No ID provided" }, { status: 400 });

  try {
    const meeting = await Meeting.findOneAndDelete({
      _id: id,
      createdBy: (await User.findOne({ email: session.user.email }))._id,
    });
    if (!meeting)
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    return NextResponse.json({ message: "Meeting deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/meetings error:", error);
    return NextResponse.json(
      { error: "Failed to delete meeting" },
      { status: 500 }
    );
  }
}
