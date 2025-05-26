"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const plan = searchParams.get("plan");
  const price = searchParams.get("price");
  const interval = searchParams.get("interval");

  useEffect(() => {
    if (!plan || !price || !interval) {
      router.replace("/pages/pricing");
      return;
    }

    const startCheckout = async () => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, price, interval }),
      });

      const data = await res.json();
      if (res.ok && data?.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to redirect to Stripe Checkout");
        router.replace("/pages/pricing");
      }
    };

    startCheckout();
  }, [plan, price, interval, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-black">
      <h1 className="text-xl mb-4">
        Redirecting to checkout for {plan} plan...
      </h1>
    </div>
  );
}
