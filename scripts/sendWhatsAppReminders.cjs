#!/usr/bin/env node
// scripts/scheduler.cjs

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const cron = require('node-cron');
const Twilio = require('twilio');
const axios = require('axios');

// ─── Models & DB ──────────────────────────────────────────
const { connectDB } = require('../lib/dbConnect');
require('../models/Event');
require('../models/Meeting');
require('../models/UserProfile');
require('../models/Forecast');
require('../models/Briefing');

const Event = mongoose.model('Event');
const Meeting = mongoose.model('Meeting');
const UserProfile = mongoose.model('UserProfile');
const Forecast = mongoose.model('Forecast');
const Briefing = mongoose.model('Briefing');

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
	const tolerance = 60 * 1000; // 1m window
	const windowEnd = new Date(
		now + Math.max(...offsets) * 60 * 1000 + tolerance
	);

	const [events, meetings] = await Promise.all([
		Event.find({ start: { $gte: new Date(now), $lt: windowEnd } }),
		Meeting.find({ date: { $gte: new Date(now), $lt: windowEnd } }),
	]);

	const items = [
		...events.map((e) => ({
			type: 'Event',
			id: e._id,
			title: e.title,
			time: e.start,
			user: e.createdBy,
		})),
		...meetings.map((m) => ({
			type: 'Meeting',
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

			// load user phone once
			const uid = item.user.toString();
			if (!phoneCache.has(uid)) {
				const prof = await UserProfile.findOne({ user: item.user });
				phoneCache.set(uid, prof?.phone);
			}
			const phone = phoneCache.get(uid);
			if (!phone || !phone.startsWith('+')) {
				console.warn(`Skipping invalid phone for user ${uid}:`, phone);
				continue;
			}

			// Prepare template data
			const when = mins === 60 ? 'in 1 hour' : 'in 10 minutes';
			const from = process.env.TWILIO_WHATSAPP_FROM; // must include `whatsapp:`
			const to = `whatsapp:${phone}`;
			console.log(`→ Sending reminder template from=${from} to=${to}`);

			try {
				const msg = await twilioClient.messages.create({
					from,
					to,
					contentTemplate: {
						name: 'reminder_template', // your approved template name
						language: { code: 'en_US' },
						components: [
							{
								type: 'body',
								parameters: [
									{ type: 'text', text: item.type }, // {{1}}
									{ type: 'text', text: when }, // {{2}}
									{ type: 'text', text: item.time.toLocaleString() }, // {{3}}
								],
							},
						],
					},
				});
				console.log(`   ↳ Twilio queued SID=${msg.sid} status=${msg.status}`);
			} catch (err) {
				console.error('   ↳ Twilio error:', err);
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
			if (!loc) throw new Error('Geocoding failed');

			// Fetch current weather
			const weatherRes = await axios.get(
				`https://api.open-meteo.com/v1/forecast` +
					`?latitude=${loc.latitude}&longitude=${loc.longitude}` +
					`&current_weather=true&timezone=auto`
			);
			const cw = weatherRes.data.current_weather;
			if (!cw) throw new Error('No current_weather');

			// Upsert
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
		if (!prof.phone || !prof.phone.startsWith('+')) continue;

		try {
			// Call your briefing API
			const res = await axios.post(`${process.env.NEXTAUTH_URL}/api/briefing`);
			const { summary } = res.data;
			if (!summary) throw new Error('No summary returned');

			// Save in Mongo
			await Briefing.findOneAndUpdate(
				{ user: prof.user, date: today },
				{ summary },
				{ upsert: true, new: true }
			);

			// Send via WhatsApp template
			const from = process.env.TWILIO_WHATSAPP_FROM;
			const to = `whatsapp:${prof.phone}`;
			console.log(`→ Sending briefing template to=${to}`);

			const msg = await twilioClient.messages.create({
				from,
				to,
				contentTemplate: {
					name: 'briefing_template', // your approved briefing template
					language: { code: 'en_US' },
					components: [
						{
							type: 'body',
							parameters: [
								{ type: 'text', text: summary }, // {{1}}
							],
						},
					],
				},
			});
			console.log(`   ↳ Briefing queued SID=${msg.sid}`);
		} catch (e) {
			console.error(`Briefing error for user ${prof.user}:`, e);
		}
	}
}

// ─── Cron Schedules ────────────────────────────────────────

// 1️⃣ Every minute
cron.schedule('* * * * *', () => sendWhatsAppReminders().catch(console.error), {
	timezone: 'Asia/Kuching',
});
console.log('✅ Scheduled: WhatsApp reminders every minute');

// 2️⃣ Every 6 hours
cron.schedule(
	'0 */6 * * *',
	() => fetchAndStoreWeather().catch(console.error),
	{ timezone: 'Asia/Kuching' }
);
console.log('✅ Scheduled: Weather fetch every 6 hours');

// 3️⃣ Daily at 07:00
cron.schedule(
	'0 7 * * *',
	async () => {
		try {
			await fetchAndStoreWeather();
			await sendDailyBriefings();
		} catch (e) {
			console.error('Error in daily 07:00 job:', e);
		}
	},
	{ timezone: 'Asia/Kuching' }
);
console.log('✅ Scheduled: Daily briefing & weather at 07:00');

console.log('🚀 Scheduler started.');
