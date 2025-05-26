"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Welcome back!",
        timer: 1500,
        showConfirmButton: false,
      });
      setTimeout(() => router.push("/pages/dashboard"), 1600);
    } else {
      Swal.fire({
        icon: "error",
        title: "Login failed",
        text: "Invalid email or password",
      });
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/pages/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
          Sign In
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-md font-medium transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="flex items-center justify-center">
          <span className="text-gray-400 text-sm">or</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 py-2 rounded-md hover:shadow transition"
        >
          <FcGoogle size={22} />
          <span className="text-sm font-medium text-gray-700 dark:text-white">
            Sign in with Google
          </span>
        </button>

        <div className="text-sm text-center text-gray-600 dark:text-gray-400">
          <a href="/pages/register" className="text-blue-500 hover:underline">
            Create account
          </a>{" "}
          •{" "}
          <a
            href="/pages/forgot-password"
            className="text-blue-500 hover:underline"
          >
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
