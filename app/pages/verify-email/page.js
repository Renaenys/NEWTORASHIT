"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import SixDigitInput from "@/components/SixDigitInput";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(defaultEmail);
  const [hasSent, setHasSent] = useState(false);

  const handleSend = async () => {
    if (!email) {
      Swal.fire({ icon: "warning", title: "Please enter your email" });
      return;
    }

    const res = await fetch("/api/auth/send-verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    Swal.fire({
      icon: res.ok ? "success" : "error",
      title: res.ok ? "Verification Sent" : "Error",
      text: res.ok
        ? "Please check your inbox."
        : data.error || "Failed to send code.",
    });
  };

  const handleVerifyCode = async (code) => {
    const res = await fetch("/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Verified!",
        text: "Redirecting to login...",
        timer: 2000,
        showConfirmButton: false,
      });
      setTimeout(() => router.push("/pages/login"), 2100);
    } else {
      Swal.fire({
        icon: "error",
        title: "Invalid or Expired Code",
        text: data.error || "Please try again",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
          Verify Your Email
        </h2>

        <input
          type="email"
          placeholder="Enter your email"
          className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleSend}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
        >
          Resend Code
        </button>

        <div className="pt-4">
          <SixDigitInput onComplete={handleVerifyCode} />
        </div>
      </div>
    </div>
  );
}
