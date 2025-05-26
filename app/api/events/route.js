// app/api/events/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import Event from "@/models/Event";
import User from "@/models/User";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  const evts = await Event.find({ createdBy: user._id }).sort({ start: -1 });
  return NextResponse.json(evts);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const data = await request.json();
    const event = await Event.create({
      title: data.title,
      description: data.description,
      start: new Date(data.start),
      end: data.end ? new Date(data.end) : undefined,
      allDay: data.allDay || false,
      createdBy: user._id,
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
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
  if (data.description) updates.description = data.description;
  if (data.start) updates.start = new Date(data.start);
  if (data.end) updates.end = new Date(data.end);
  if (data.allDay !== undefined) updates.allDay = data.allDay;

  try {
    const event = await Event.findOneAndUpdate(
      {
        _id: id,
        createdBy: (await User.findOne({ email: session.user.email }))._id,
      },
      updates,
      { new: true }
    );
    if (!event)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json(event, { status: 200 });
  } catch (error) {
    console.error("PUT /api/events error:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
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
    const event = await Event.findOneAndDelete({
      _id: id,
      createdBy: (await User.findOne({ email: session.user.email }))._id,
    });
    if (!event)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json({ message: "Event deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/events error:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
