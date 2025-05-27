import { useEffect } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const b64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw.split("").map(c => c.charCodeAt(0)));
}

export function useWebPush() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg;
    navigator.serviceWorker
      .register("/sw.js")
      .then(r => { reg = r; return Notification.requestPermission(); })
      .then(permission => {
        if (permission !== "granted") throw new Error("Permission denied");
        return reg.pushManager.getSubscription();
      })
      .then(sub => {
        if (sub) return sub;
        const key = urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        );
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key
        });
      })
      .then(subscription => {
        // send subscription object to backend
        return fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription)
        });
      })
      .catch(console.error);
  }, []);
}
