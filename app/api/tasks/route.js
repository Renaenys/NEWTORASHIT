// app/api/tasks/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import Task from "@/models/Task";
import User from "@/models/User";

export async function GET(request) {
  // 1) auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) connect + find user
  await connectDB();
  const userDoc = await User.findOne({ email: session.user.email });
  if (!userDoc) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 3) return only that user’s tasks
  const tasks = await Task.find({ createdBy: userDoc._id })
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();

  return NextResponse.json(tasks, { status: 200 });
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
    const task = await Task.create({
      title: data.title,
      description: data.description || "",
      dueDate: data.dateTime ? new Date(data.dateTime) : Date.now(),
      completed: data.completed ?? false,
      createdBy: user._id,
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
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

  // only update fields allowed
  const updates = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.completed !== undefined) updates.completed = data.completed;
  if (data.dateTime !== undefined) updates.dueDate = new Date(data.dateTime);

  try {
    const task = await Task.findOneAndUpdate(
      {
        _id: id,
        createdBy: (await User.findOne({ email: session.user.email }))._id,
      },
      updates,
      { new: true }
    );
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json(task, { status: 200 });
  } catch (error) {
    console.error("PUT /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
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
    const task = await Task.findOneAndDelete({
      _id: id,
      createdBy: (await User.findOne({ email: session.user.email }))._id,
    });
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ message: "Task deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
