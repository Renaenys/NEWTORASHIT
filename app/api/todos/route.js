// app/api/todos/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import Todo from "@/models/Todo";
import User from "@/models/User";

async function getUser() {
  const sess = await getServerSession(authOptions);
  if (!sess) throw new NextResponse("Unauthorized", { status: 401 });
  await connectDB();
  const u = await User.findOne({ email: sess.user.email });
  if (!u) throw new NextResponse("User not found", { status: 404 });
  return u;
}

export async function GET() {
  const user = await getUser();
  const todos = await Todo.find({ user: user._id }).sort({ createdAt: -1 });
  return NextResponse.json(todos);
}

export async function POST(request) {
  const user = await getUser();
  const { title } = await request.json();
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  const todo = await Todo.create({ user: user._id, title });
  return NextResponse.json(todo, { status: 201 });
}

export async function PUT(request) {
  const user = await getUser();
  const { id, done } = await request.json();
  if (!id || typeof done !== "boolean") {
    return NextResponse.json({ error: "id & done required" }, { status: 400 });
  }
  const todo = await Todo.findOneAndUpdate(
    { _id: id, user: user._id },
    { done },
    { new: true }
  );
  if (!todo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(todo);
}

export async function DELETE(request) {
  const user = await getUser();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await Todo.deleteOne({ _id: id, user: user._id });
  return NextResponse.json({ success: true });
}
