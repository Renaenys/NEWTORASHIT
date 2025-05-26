"use client";

import { useState } from "react";
import Swal from "sweetalert2";

export default function EmailComposeModal({ onClose }) {
  const [form, setForm] = useState({
    to: "",
    subject: "",
    text: "",
  });
  const [sending, setSending] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSend = async () => {
    if (!form.to || !form.subject || !form.text) {
      Swal.fire("Error", "All fields are required.", "warning");
      return;
    }

    setSending(true);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSending(false);

    if (res.ok) {
      Swal.fire("✅ Sent!", "Your email has been sent.", "success");
      onClose();
    } else {
      Swal.fire("❌ Failed", data.error || "Something went wrong.", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-[95%] max-w-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          ✉️ Compose Email
        </h2>
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Recipient Email"
            value={form.to}
            onChange={(e) => handleChange("to", e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="Subject"
            value={form.subject}
            onChange={(e) => handleChange("subject", e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <textarea
            placeholder="Message..."
            rows={8}
            value={form.text}
            onChange={(e) => handleChange("text", e.target.value)}
            className="w-full px-4 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end mt-4 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
