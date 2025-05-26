"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Starter",
    monthly: 10,
    features: ["Basic Tools", "Email Support"],
  },
  {
    name: "Pro",
    monthly: 20,
    features: [
      "All Starter Features",
      "Priority Chat Support",
      "Advanced Reports",
    ],
  },
  {
    name: "Enterprise",
    monthly: 30,
    features: ["All Pro Features", "Team Accounts", "Dedicated Manager"],
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const router = useRouter();

  const calculatePrice = (monthly) =>
    isYearly ? (monthly * 12 * 0.9).toFixed(2) : monthly.toFixed(2);

  const handleStripeRedirect = async (plan, price) => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        price,
        interval: isYearly ? "yearly" : "monthly",
      }),
    });

    const data = await res.json();
    if (res.ok && data?.url) {
      window.location.href = data.url;
    } else {
      alert("Stripe checkout failed.");
    }
  };

  const handleTrialStart = async () => {
    const res = await fetch("/api/subscribe-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (res.ok && data?.success) {
      router.push("/pages/dashboard");
    } else {
      alert("Trial setup failed: " + (data?.error || "Unknown error"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-6">
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => (window.location.href = "http://localhost:3000")}
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white transition"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Choose Your Plan
        </h1>
        <p className="text-gray-500 dark:text-gray-300">
          Switch between monthly and yearly billing.
        </p>

        {/* Toggle */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <span
            className={`text-sm font-medium ${
              !isYearly
                ? "text-purple-700 dark:text-purple-400 font-bold"
                : "text-gray-800 dark:text-gray-200"
            }`}
          >
            Monthly
          </span>

          <label className="relative inline-block w-12 h-6">
            <input
              type="checkbox"
              className="opacity-0 w-0 h-0 peer"
              checked={isYearly}
              onChange={() => setIsYearly(!isYearly)}
            />
            <div className="absolute top-0 left-0 w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-purple-600 transition-colors duration-300" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 peer-checked:translate-x-6" />
          </label>

          <span
            className={`text-sm font-medium ${
              isYearly
                ? "text-purple-700 dark:text-purple-400 font-bold"
                : "text-gray-800 dark:text-gray-200"
            }`}
          >
            Yearly (10% off)
          </span>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
        {/* Trial Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-purple-500">
          <h2 className="text-lg font-bold text-purple-700 dark:text-purple-400">
            🎉 Free Trial
          </h2>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            $0
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            7-Day Full Access
          </p>
          <ul className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-200">
            <li>✅ All Basic Features</li>
            <li>✅ Cancel Anytime</li>
          </ul>
          <button
            onClick={handleTrialStart}
            className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded"
          >
            Start Free Trial
          </button>
        </div>

        {/* Paid Plans */}
        {plans.map((plan) => {
          const price = calculatePrice(plan.monthly);
          return (
            <div
              key={plan.name}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow"
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {plan.name}
              </h2>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
                ${price}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-300">
                per {isYearly ? "year" : "month"}
              </p>
              <ul className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-200">
                {plan.features.map((f, i) => (
                  <li key={i}>✅ {f}</li>
                ))}
              </ul>
              <button
                onClick={() => handleStripeRedirect(plan.name, price)}
                className="mt-6 w-full bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-2 rounded"
              >
                Choose {plan.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
