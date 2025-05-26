// app/api/stripe/success/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import UserProfile from "@/models/UserProfile";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect("/pages/login");
  }
  await connectDB();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.redirect("/pages/login");
  }

  // On paid subscription, mark memberStatus=“paid” and clear trial
  await UserProfile.findOneAndUpdate(
    { user: user._id },
    {
      memberStatus: "paid",
      memberExpire: null,
      // keep existing country/city or set dummy if missing
      country: { $ifNull: ["$country", "US"] },
      city: { $ifNull: ["$city", "New York"] },
    },
    { upsert: true }
  );

  // redirect to dashboard
  return NextResponse.redirect("/pages/dashboard");
}
