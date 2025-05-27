#!/usr/bin/env node
// scripts/sendWhatsAppReminders.cjs

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const cron = require("node-cron");
const webpush = require("web-push");

const { connectDB } = require("../lib/dbConnect");
require("../models/Event");
require("../models/Meeting");
require("../models/Subscription");

const Event = mongoose.model("Event");
const Meeting = mongoose.model("Meeting");
const Subscription = mongoose.model("Subscription");

// 1️⃣ Configure VAPID
webpush.setVapidDetails(
  "mailto:you@yourdomain.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Helper to broadcast a payload to all subscribers
async function broadcastPush(payload) {
  await connectDB();
  const subs = await Subscription.find({});
  await Promise.all(
    subs.map((sub) =>
      webpush
        .sendNotification(sub, JSON.stringify(payload))
        .catch((err) => console.error("Push failed:", err))
    )
  );
}

// 2️⃣ Reminders logic (every minute)
async function sendReminders() {
  await connectDB();

  const now = Date.now();
  const offsets = [60, 10]; // minutes before
  const tol = 60 * 1000; // 1 minute window
  const windowEnd = new Date(now + Math.max(...offsets) * 60 * 1000 + tol);

  const [events, meetings] = await Promise.all([
    Event.find({ start: { $gte: new Date(now), $lt: windowEnd } }),
    Meeting.find({ date: { $gte: new Date(now), $lt: windowEnd } }),
  ]);

  const items = [
    ...events.map((e) => ({ type: "Event", title: e.title, time: e.start })),
    ...meetings.map((m) => ({ type: "Meeting", title: m.title, time: m.date })),
  ];

  for (const item of items) {
    const delta = item.time.getTime() - now;
    for (const mins of offsets) {
      if (Math.abs(delta - mins * 60 * 1000) > tol) continue;
      const when = mins === 60 ? "in 1 hour" : "in 10 minutes";
      const title = `⏰ ${item.type} ${when}`;
      const body = `“${item.title}” at ${item.time.toLocaleString()}`;

      console.log(`→ Pushing: ${title}`);
      await broadcastPush({ title, body });
    }
  }
}

// 3️⃣ Schedule it
cron.schedule("* * * * *", () => sendReminders().catch(console.error), {
  timezone: "Asia/Kuching",
});

console.log("✅ Scheduled: push reminders every minute");
console.log("🚀 Web-Push scheduler started.");
