import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import Email from "@/models/Email";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findOne({ email: session.user.email });

  const emails = await Email.find({ user: user._id })
    .sort({ date: -1 })
    .limit(100);

  return Response.json(emails);
}
