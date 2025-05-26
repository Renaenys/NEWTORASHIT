// components/AIReplyModal.js

"use client";

import { useState, useRef } from "react";
import Swal from "sweetalert2";
import axios from "axios";

export default function AIReplyModal({ email, onClose }) {
  const [userPrompt, setUserPrompt] = useState("");
  const [replyText, setReplyText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  // 1️⃣ Generate AI reply
  const handleGenerate = async () => {
    if (!email.html && !email.text) return;
    setGenerating(true);
    Swal.fire({
      title: "Generating reply…",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    try {
      const { data } = await axios.post("/api/email/reply", {
        emailBody: email.html || email.text,
        emailSubject: email.subject,
        emailSender: email.from,
        userPrompt,
      });
      setReplyText(data.reply);
      Swal.fire("Done", "Reply generated", "success");
    } catch (err) {
      console.error("❌ AI generation failed", err);
      Swal.fire("Error", "AI generation failed", "error");
    } finally {
      setGenerating(false);
    }
  };

  // 2️⃣ Handle file selection
  const handleFileChange = (e) => {
    setAttachments(Array.from(e.target.files));
  };

  // 3️⃣ Send the reply + attachments
  const handleSend = async () => {
    if (!replyText.trim()) {
      return Swal.fire("Error", "Reply is empty", "error");
    }
    setSending(true);
    Swal.fire({
      title: "Sending reply…",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    try {
      const form = new FormData();
      form.append("to", email.from);
      form.append("subject", `Re: ${email.subject}`);
      form.append("body", replyText);
      attachments.forEach((f) => form.append("attachments", f));

      await axios.post("/api/email/send", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire("Sent", "Your reply was sent", "success");
      onClose();
    } catch (err) {
      console.error("❌ Send failed", err);
      Swal.fire("Error", "Failed to send reply", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="
          bg-white dark:bg-gray-800 rounded-lg shadow-xl
          w-full sm:w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-4xl
          flex flex-col overflow-hidden max-h-[90vh]
        "
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            🤖 AI Suggested Reply
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
          {/* User Instruction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Additional Instruction
            </label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="e.g. Be more concise, friendly tone…"
              className="
                w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-blue-500
                resize-none h-20
              "
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="
                mt-2 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                disabled:opacity-50 transition
              "
            >
              {generating ? "Generating…" : "Generate Reply"}
            </button>
          </div>

          {/* Generated Reply */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reply
            </label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Your reply will appear here…"
              className="
                w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-blue-500
                resize-none h-40
              "
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Attach Files
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="
                inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700
                text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300
                dark:hover:bg-gray-600 transition
              "
            >
              📎 Choose Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="
                image/*,
                application/pdf,
                application/msword,
                application/vnd.openxmlformats-officedocument.wordprocessingml.document
              "
              onChange={handleFileChange}
              className="hidden"
            />
            {attachments.length > 0 && (
              <ul className="mt-2 max-h-24 overflow-auto space-y-1 text-sm text-gray-800 dark:text-gray-200">
                {attachments.map((f) => (
                  <li key={f.name} className="truncate">
                    {f.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="
              px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200
              rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition
            "
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="
              px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
              disabled:opacity-50 transition
            "
          >
            {sending ? "Sending…" : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
