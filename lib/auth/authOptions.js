import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        await connectDB();
        const user = await User.findOne({ email: credentials?.email });
        if (!user || !user.password) throw new Error("Invalid credentials");
        const match = await bcrypt.compare(credentials.password, user.password);
        if (!match) throw new Error("Invalid credentials");
        return { id: user._id.toString(), name: user.name, email: user.email };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      await connectDB();

      // Google sign-in: create user + profile if needed
      if (account?.provider === "google") {
        const existing = await User.findOne({ email: user.email });

        if (!existing) {
          const newUser = await User.create({
            name: user.name,
            email: user.email,
            emailVerified: new Date(),
          });

          const UserProfile = (await import("@/models/UserProfile")).default;

          // ✅ Create associated UserProfile with "none" status (as per schema)
          await UserProfile.create({
            user: newUser._id,
            name: newUser.name || "",
            memberStatus: "none", // or "trial" if you prefer default access
            memberExpire: null,
            tokenCredit: 0,
            smtpSetup: {},
          });
        }
      }

      return true;
    },

    async session({ session }) {
      return session;
    },

    async jwt({ token }) {
      return token;
    },
  },

  pages: {
    signIn: "/pages/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
