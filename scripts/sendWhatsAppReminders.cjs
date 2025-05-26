// scripts/scheduler.cjs

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const cron = require("node-cron");
const Twilio = require("twilio");
const axios = require("axios");

// ─── Models & DB ──────────────────────────────────────────
const { connectDB } = require("../lib/dbConnect");
require("../models/Event");
require("../models/Meeting");
require("../models/Task");
require("../models/UserProfile");
require("../models/Forecast");
require("../models/Briefing");

const Event = mongoose.model("Event");
const Meeting = mongoose.model("Meeting");
const Task = mongoose.model("Task");
const UserProfile = mongoose.model("UserProfile");
const Forecast = mongoose.model("Forecast");
const Briefing = mongoose.model("Briefing");

// ─── Twilio Setup ─────────────────────────────────────────
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ─── Helpers ──────────────────────────────────────────────
async function sendWhatsAppReminders() {
  await connectDB();
  const now = Date.now();
  const offsets = [60, 10];
  const tolerance = 60 * 1000;
  const windowEnd = new Date(
    now + Math.max(...offsets) * 60 * 1000 + 60 * 1000
  );

  // fetch upcoming
  const [events, meetings] = await Promise.all([
    Event.find({ start: { $gte: new Date(now), $lt: windowEnd } }),
    Meeting.find({ date: { $gte: new Date(now), $lt: windowEnd } }),
  ]);

  const items = [
    ...events.map((e) => ({
      type: "Event",
      id: e._id,
      title: e.title,
      time: e.start,
      user: e.createdBy,
    })),
    ...meetings.map((m) => ({
      type: "Meeting",
      id: m._id,
      title: m.title,
      time: m.date,
      user: m.createdBy,
    })),
  ];

  const sent = new Set();
  const phoneCache = new Map();

  for (const item of items) {
    const delta = item.time.getTime() - now;
    for (const mins of offsets) {
      if (Math.abs(delta - mins * 60 * 1000) > tolerance) continue;
      const key = `${item.type}:${item.id}:${mins}`;
      if (sent.has(key)) continue;
      sent.add(key);

      // fetch phone once
      const uid = item.user.toString();
      if (!phoneCache.has(uid)) {
        const prof = await UserProfile.findOne({ user: item.user });
        phoneCache.set(uid, prof?.phone);
      }
      const phone = phoneCache.get(uid);
      if (!phone) continue;

      const when = mins === 60 ? "in 1 hour" : "in 10 minutes";
      const body = `⏰ ${item.type} reminder ${when}: “${
        item.title
      }” at ${item.time.toLocaleString()}.`;

      try {
        await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM,
          to: `whatsapp:${phone}`,
          body,
        });
        console.log(`Reminder sent: ${item.type} (${mins}m) → ${phone}`);
      } catch (err) {
        console.error("Twilio error:", err.message);
      }
    }
  }
}

async function runForecast() {
  try {
    console.log("🔄 Forecast run…");
    const res = await axios.post(
      `${process.env.NEXTAUTH_URL}/api/forecast/run`
    );
    console.log("   ↳ Forecast saved:", res.data.date);
  } catch (err) {
    console.error("Forecast error:", err.response?.data || err.message);
  }
}

async function runBriefing() {
  try {
    console.log("📝 Briefing run…");
    const res = await axios.post(
      `${process.env.NEXTAUTH_URL}/api/briefing/run`
    );
    console.log("   ↳ Briefing saved:", res.data.date);
  } catch (err) {
    console.error("Briefing error:", err.response?.data || err.message);
  }
}

// ─── Cron Schedules ───────────────────────────────────────

// 1️⃣ Every minute: WhatsApp reminders
cron.schedule(
  "* * * * *",
  () => {
    sendWhatsAppReminders().catch(console.error);
  },
  { timezone: "Asia/Kuching" }
);
console.log("✅ Scheduled: WhatsApp reminders every minute");

// 2️⃣ Every 3 hours on the hour: forecast only
cron.schedule(
  "0 */3 * * *",
  () => {
    runForecast();
  },
  { timezone: "Asia/Kuching" }
);
console.log("✅ Scheduled: Forecast every 3 hours");

// 3️⃣ Daily at 07:00: forecast + briefing
cron.schedule(
  "0 7 * * *",
  () => {
    Promise.all([runForecast(), runBriefing()]);
  },
  { timezone: "Asia/Kuching" }
);
console.log("✅ Scheduled: Daily forecast+briefing at 07:00");

console.log("🚀 Scheduler started.");
