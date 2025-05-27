// app/api/forecast/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/authOptions';
import { connectDB } from '@/lib/dbConnect';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';
import Forecast from '@/models/Forecast';
import axios from 'axios';

async function getUserAndProfile() {
	const session = await getServerSession(authOptions);
	if (!session) throw { status: 401, body: { error: 'Unauthorized' } };

	await connectDB();
	const user = await User.findOne({ email: session.user.email });
	if (!user) throw { status: 404, body: { error: 'User not found' } };

	const profile = await UserProfile.findOne({ user: user._id });
	if (!profile) throw { status: 404, body: { error: 'Profile not found' } };

	return { user, profile };
}

export async function GET(request) {
	try {
		const { user } = await getUserAndProfile();
		const today = new Date().toISOString().slice(0, 10);

		const record = await Forecast.findOne({ user: user._id, date: today });
		// return null if no data yet
		return NextResponse.json(record ? record.data : null);
	} catch (err) {
		return NextResponse.json(err.body || { error: 'Server error' }, {
			status: err.status || 500,
		});
	}
}

export async function POST(request) {
	try {
		const { user, profile } = await getUserAndProfile();
		const today = new Date().toISOString().slice(0, 10);

		// geocode
		const geoRes = await axios.get(
			`https://geocoding-api.open-meteo.com/v1/search` +
				`?name=${encodeURIComponent(profile.city)}` +
				`&country=${encodeURIComponent(profile.country)}` +
				`&count=1`
		);
		const loc = geoRes.data.results?.[0];
		if (!loc) throw new Error('Geocoding failed');

		// fetch 3-day forecast
		const wRes = await axios.get(
			`https://api.open-meteo.com/v1/forecast` +
				`?latitude=${loc.latitude}&longitude=${loc.longitude}` +
				`&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
		);
		const daily = wRes.data.daily;
		if (!daily) throw new Error('No forecast data');

		// upsert with $setOnInsert to guarantee `user` and `date` on insert
		const record = await Forecast.findOneAndUpdate(
			{ user: user._id, date: today },
			{
				$set: { data: daily },
				$setOnInsert: { user: user._id, date: today },
			},
			{ upsert: true, new: true }
		);

		return NextResponse.json(record.data);
	} catch (err) {
		console.error('POST /api/forecast error:', err);
		const message = err.body?.error || err.message || 'Server error';
		const status = err.status || 500;
		return NextResponse.json({ error: message }, { status });
	}
}
