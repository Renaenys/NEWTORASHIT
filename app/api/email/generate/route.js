// app/api/email/generate/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: true,
  },
};

export async function POST(req) {
  // 1. Auth (optional — remove if you want public access)
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Extract prompt
  const { prompt } = await req.json();
  if (!prompt || !prompt.trim()) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  try {
    // 3. Call OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or another model you have access to
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. " +
            "Generate a short email subject and body based on the user’s prompt. " +
            "Respond with valid JSON only, with two fields: subject and body.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = chat.choices[0].message.content;
    // 4. Parse JSON out of the model’s response:
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // fallback if model didn’t return strict JSON
      return NextResponse.json(
        { error: "AI did not return valid JSON" },
        { status: 500 }
      );
    }

    const { subject, body } = parsed;
    if (!subject || !body) {
      return NextResponse.json(
        { error: "AI JSON missing subject or body" },
        { status: 500 }
      );
    }

    // 5. Return to front-end
    return NextResponse.json({ subject, body });
  } catch (err) {
    console.error("❌ AI generate error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate email" },
      { status: 500 }
    );
  }
}
