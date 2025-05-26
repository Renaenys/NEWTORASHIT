// app/api/email/reply/route.js

import { NextResponse } from "next/server";
import { generateEmailReply } from "@/lib/langchainAI";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

// ─── LANGUAGE DETECTION HELPER ─────────────────────────────────────────────
function detectLanguage(text) {
  if (!text) return "eng";
  const lower = text.toLowerCase();
  // Chinese
  if (/[一-龥]/.test(text)) return "chi";
  // Malay keywords
  const malay = ["saya", "anda", "kami", "terima kasih", "boleh", "apa"];
  if (malay.some((w) => lower.includes(w))) return "mal";
  return "eng";
}

export async function POST(request) {
  // 1️⃣ Auth
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2️⃣ Parse inputs
  const {
    emailBody,
    emailSubject = "(no subject)",
    emailSender = "the sender",
    userPrompt = "",
  } = await request.json();

  if (!emailBody || typeof emailBody !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid emailBody" },
      { status: 400 }
    );
  }

  // 3️⃣ Determine language & user name
  const langCode = detectLanguage(emailBody);
  const userName = session.user.name || session.user.email;

  try {
    // 4️⃣ Generate the AI reply
    const reply = await generateEmailReply(
      emailBody,
      emailSubject,
      emailSender,
      langCode,
      userName,
      userPrompt
    );
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("❌ AI reply generation failed:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
