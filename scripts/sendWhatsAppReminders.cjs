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
require("../models/UserProfile");
require("../models/Forecast");
require("../models/Briefing");

const Event = mongoose.model("Event");
const Meeting = mongoose.model("Meeting");
const UserProfile = mongoose.model("UserProfile");
const Forecast = mongoose.model("Forecast");
const Briefing = mongoose.model("Briefing");

// ─── Twilio Setup ─────────────────────────────────────────
const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ─── 1) WhatsApp Reminders ────────────────────────────────
async function sendWhatsAppReminders() {
  await connectDB();
  const now = Date.now();
  const offsets = [60, 10]; // minutes before
  const tolerance = 60 * 1000; // 1 minute window
  const windowEnd = new Date(
    now + Math.max(...offsets) * 60 * 1000 + tolerance
  );

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

// ─── 2) Weather Fetch ─────────────────────────────────────
async function fetchAndStoreWeather() {
  await connectDB();
  const today = new Date().toISOString().slice(0, 10);
  const profiles = await UserProfile.find({});

  for (const prof of profiles) {
    if (!prof.country || !prof.city) continue;
    try {
      // Geocode
      const geoRes = await axios.get(
        `https://geocoding-api.open-meteo.com/v1/search` +
          `?name=${encodeURIComponent(prof.city)}` +
          `&country=${encodeURIComponent(prof.country)}` +
          `&count=1`
      );
      const loc = geoRes.data.results?.[0];
      if (!loc) throw new Error("Geocoding failed");

      // Fetch current weather
      const weatherRes = await axios.get(
        `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${loc.latitude}&longitude=${loc.longitude}` +
          `&current_weather=true&timezone=auto`
      );
      const cw = weatherRes.data.current_weather;
      if (!cw) throw new Error("No current_weather");

      // Upsert into DB
      await Forecast.findOneAndUpdate(
        { user: prof.user, date: today },
        {
          location: loc.name,
          temperature: cw.temperature,
          windspeed: cw.windspeed,
          weathercode: cw.weathercode,
          time: cw.time,
        },
        { upsert: true, new: true }
      );
      console.log(`Weather saved for user ${prof.user} on ${today}`);
    } catch (e) {
      console.error(`Weather error for user ${prof.user}:`, e.message);
    }
  }
}

// ─── 3) Daily Briefing ────────────────────────────────────
async function sendDailyBriefings() {
  await connectDB();
  const today = new Date().toISOString().slice(0, 10);
  const profiles = await UserProfile.find({});

  for (const prof of profiles) {
    if (!prof.phone) continue;

    try {
      // 1) Trigger your Next.js briefing API
      const apiUrl = `${process.env.NEXTAUTH_URL}/api/briefing`;
      const res = await axios.post(apiUrl);
      const { summary } = res.data;
      if (!summary) throw new Error("No summary returned");

      // 2) Store it locally as well (in case your API didn’t upsert)
      await Briefing.findOneAndUpdate(
        { user: prof.user, date: today },
        { summary },
        { upsert: true, new: true }
      );

      // 3) Send via WhatsApp
      const body = `🗒️ Daily Briefing:\n${summary}`;
      await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${prof.phone}`,
        body,
      });
      console.log(`Briefing sent to ${prof.user} → ${prof.phone}`);
    } catch (e) {
      console.error(`Briefing error for user ${prof.user}:`, e.message);
    }
  }
}

// ─── Cron Schedules ────────────────────────────────────────

// 1️⃣ Every minute: event/meeting reminders
cron.schedule("* * * * *", () => sendWhatsAppReminders().catch(console.error), {
  timezone: "Asia/Kuching",
});
console.log("✅ Scheduled: WhatsApp reminders every minute");

// 2️⃣ Every 6 hours: weather fetch
cron.schedule(
  "0 */6 * * *",
  () => fetchAndStoreWeather().catch(console.error),
  { timezone: "Asia/Kuching" }
);
console.log("✅ Scheduled: Weather fetch every 6 hours (Asia/Kuching)");

// 3️⃣ Daily at 07:00: weather + briefing + WhatsApp
cron.schedule(
  "0 7 * * *",
  async () => {
    try {
      // refresh weather one more time at 07:00
      await fetchAndStoreWeather();
      // generate & send daily briefing
      await sendDailyBriefings();
    } catch (e) {
      console.error("Error in daily 07:00 job:", e);
    }
  },
  { timezone: "Asia/Kuching" }
);
console.log("✅ Scheduled: Daily briefing & weather at 07:00 (Asia/Kuching)");

console.log("🚀 Scheduler started.");
