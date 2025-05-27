// components/NotificationToggle.jsx
"use client";

import { useState } from "react";

// ← safe, loop-based conversion—no spread() on unknown types
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export default function NotificationToggle() {
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "granted" | "denied"

  const subscribe = async () => {
    setStatus("loading");
    try {
      if (!("serviceWorker" in navigator))
        throw new Error("No service workers");
      // 1) register your SW
      const reg = await navigator.serviceWorker.register("/sw.js");
      // 2) ask for permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      // 3) get or create a subscription
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const key = urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        );
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
      }
      // 4) send it to your backend
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("Failed to save subscription");
      setStatus("granted");
    } catch (err) {
      console.error("Push subscription error:", err);
      setStatus("denied");
    }
  };

  if (status === "granted") {
    return (
      <button disabled className="px-4 py-2 bg-gray-300 rounded">
        🔔 Enabled
      </button>
    );
  }
  if (status === "denied") {
    return (
      <button disabled className="px-4 py-2 bg-gray-300 rounded">
        Notifications Blocked
      </button>
    );
  }
  return (
    <button
      onClick={subscribe}
      disabled={status === "loading"}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      {status === "loading" ? "Subscribing…" : "Enable Notifications"}
    </button>
  );
}
