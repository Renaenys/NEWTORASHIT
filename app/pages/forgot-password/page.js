"use client";

import { useState } from "react";
import Swal from "sweetalert2";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    Swal.fire({
      icon: res.ok ? "success" : "error",
      title: res.ok ? "Reset Link Sent" : "Error",
      text: res.ok
        ? "Please check your email."
        : data.error || "Failed to send reset link.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-xl shadow space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
          Forgot Password
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Send Reset Link
          </button>
        </form>
        <div className="text-center text-sm">
          <a href="/pages/login" className="text-blue-500 hover:underline">
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}
