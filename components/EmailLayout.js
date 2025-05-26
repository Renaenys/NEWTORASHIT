// components/EmailLayout.js

"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import DOMPurify from "dompurify";
import AIReplyModal from "./AIReplyModal";

// helper for file icons
const fileIcon = (file) => {
  if (file.type.startsWith("image/")) return "🖼️";
  if (file.type === "application/pdf") return "📄";
  return "📎";
};

export default function EmailLayout() {
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState({ to: "", subject: "", body: "" });
  const [aiPrompt, setAiPrompt] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showAIReply, setShowAIReply] = useState(false);

  // ref for the hidden file input in compose modal
  const composeFileInputRef = useRef(null);

  // Load inbox
  useEffect(() => {
    (async () => {
      try {
        Swal.fire({
          title: "Loading inbox...",
          didOpen: () => Swal.showLoading(),
        });
        const { data } = await axios.get("/api/email");
        setEmails(data);
        Swal.close();
      } catch {
        Swal.fire("Error", "Failed to load emails", "error");
      }
    })();
  }, []);

  // Sync IMAP → Mongo
  const fetchEmails = async () => {
    Swal.fire({ title: "Syncing...", didOpen: () => Swal.showLoading() });
    try {
      await axios.get("/api/email/live");
      const { data } = await axios.get("/api/email");
      setEmails(data);
      Swal.fire("Synced", "Inbox updated", "success");
    } catch {
      Swal.fire("Error", "Failed to sync inbox", "error");
    }
  };

  // AI generate
  const generateEmail = async () => {
    if (!aiPrompt.trim())
      return Swal.fire("Error", "Enter an AI prompt", "error");
    Swal.fire({
      title: "Generating…",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    try {
      const { data } = await axios.post("/api/email/generate", {
        prompt: aiPrompt,
      });
      setNewEmail({ ...newEmail, subject: data.subject, body: data.body });
      Swal.fire("Done", "Email generated", "success");
    } catch {
      Swal.fire("Error", "AI generation failed", "error");
    }
  };

  // File selection for compose
  const handleComposeFileChange = (e) => {
    setAttachments(Array.from(e.target.files));
  };

  // Send email
  const sendEmail = async () => {
    try {
      setSending(true);
      const form = new FormData();
      form.append("to", newEmail.to);
      form.append("subject", newEmail.subject);
      form.append("body", newEmail.body);
      attachments.forEach((f) => form.append("attachments", f));
      await axios.post("/api/email/send", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSending(false);
      setShowForm(false);
      setAttachments([]);
      setAiPrompt("");
      Swal.fire("Sent", "Email sent successfully", "success");
      setNewEmail({ to: "", subject: "", body: "" });
    } catch {
      Swal.fire("Error", "Failed to send email", "error");
      setSending(false);
    }
  };

  // Mark read
  const markAsRead = async (uid) => {
    await axios.post("/api/email/mark-read", { uid });
    setEmails((list) =>
      list.map((e) => (e.uid === uid ? { ...e, seen: true } : e))
    );
    if (selected?.uid === uid) setSelected({ ...selected, seen: true });
  };

  // Delete
  const deleteEmail = async (uid, mongoId) => {
    Swal.fire({
      title: "Deleting…",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });
    try {
      await axios.post("/api/email/delete", { uid, mongoId });
      setEmails((list) => list.filter((e) => e.uid !== uid));
      setSelected((s) => (s?.uid === uid ? null : s));
      Swal.fire("Deleted", "Email removed", "success");
    } catch {
      Swal.fire("Error", "Failed to delete email", "error");
    }
  };

  return (
    <div className="h-screen w-full max-w-[100vw] bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      <div className="flex flex-col md:flex-row h-full">
        {/*───────────────*/}
        {/* Inbox List   */}
        {/*───────────────*/}
        <aside
          className={`
            flex flex-col w-full md:w-1/4 max-w-full bg-white dark:bg-gray-800
            md:h-screen border-r border-gray-200 dark:border-gray-700 box-border
            ${selected ? "hidden md:flex" : "flex"}
          `}
        >
          <div className="px-4 py-2 box-border">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              📬 Inbox
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="w-full px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ✉️ Send
              </button>
              <button
                onClick={fetchEmails}
                className="w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🔁 Sync
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 box-border">
            {emails.length === 0 ? (
              <p className="p-4 text-gray-500 dark:text-gray-400">No emails</p>
            ) : (
              emails.map((email) => {
                const isSel = selected?.uid === email.uid;
                return (
                  <div
                    key={email.uid}
                    onClick={() => {
                      markAsRead(email.uid);
                      setSelected(email);
                    }}
                    className={`
                      p-3 flex min-w-0 items-center justify-between cursor-pointer
                      ${
                        isSel
                          ? "bg-purple-50 dark:bg-purple-900"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }
                    `}
                  >
                    <div className="min-w-0">
                      <p
                        className={`
                          truncate text-sm
                          ${
                            email.seen
                              ? "text-gray-600 dark:text-gray-400"
                              : "font-medium text-gray-900 dark:text-white"
                          }
                        `}
                      >
                        {email.subject}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {email.from || "Unknown"}
                      </p>
                    </div>
                    {!email.seen && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded dark:bg-green-900 dark:text-green-200">
                        Unread
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/*───────────────*/}
        {/* Detail Pane   */}
        {/*───────────────*/}
        <main
          className={`
            w-full md:w-3/4 max-w-full bg-white dark:bg-gray-800
            px-4 md:px-6 py-4 overflow-y-auto h-full md:h-screen box-border
            ${selected ? "block" : "hidden"} md:block
          `}
        >
          {/* back on mobile */}
          <button
            onClick={() => setSelected(null)}
            className="mb-4 text-blue-500 md:hidden"
          >
            ← Back to Inbox
          </button>

          {selected ? (
            <>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words">
                  {selected.subject}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                  From: {selected.from}
                </p>
              </div>

              <div className="flex space-x-3 my-4">
                <button
                  onClick={() => setShowAIReply(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  🤖 Reply
                </button>
                <button
                  onClick={() => deleteEmail(selected.uid, selected._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  🗑️ Delete
                </button>
              </div>

              <div className="w-full h-full overflow-y-auto border rounded box-border">
                <iframe
                  sandbox="allow-same-origin allow-popups"
                  srcDoc={`
                    <base target="_blank">
                    <style>
                      *, *::before, *::after {
                        background: transparent !important;
                        color: inherit !important;
                        box-sizing: border-box !important;
                        max-width: 100% !important;
                        width: auto !important;
                        overflow-wrap: break-word !important;
                      }
                      img, table { max-width: 100% !important; height: auto !important; }
                      body { margin:0; padding:16px; background: white !important; color: black !important; font-family: inherit; }
                      a { color: blue !important; }
                    </style>
                    ${DOMPurify.sanitize(selected.html || selected.text || "")}
                  `}
                  className="w-full h-full border-none bg-transparent"
                />
              </div>

              {showAIReply && (
                <AIReplyModal
                  email={selected}
                  onClose={() => setShowAIReply(false)}
                />
              )}
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Select an email to view
            </p>
          )}
        </main>
      </div>

      {/*───────────────*/}
      {/* Compose Modal  */}
      {/*───────────────*/}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div
            className={`
        bg-white dark:bg-gray-900 rounded-lg shadow-xl
        w-full sm:w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 max-w-4xl
        flex flex-col overflow-hidden max-h-[90vh]
      `}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                ✉️ Compose Email
              </h3>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              {/* AI Prompt */}
              <textarea
                placeholder="🤖 Enter prompt…"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 h-20 resize-none"
              />
              <button
                onClick={generateEmail}
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Generate with AI
              </button>

              {/* Attach Files */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attach Files
                </label>
                <button
                  type="button"
                  onClick={() => composeFileInputRef.current.click()}
                  className="
              inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700
              text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300
              dark:hover:bg-gray-600 transition
            "
                >
                  📎 Choose Files
                </button>
                <input
                  ref={composeFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleComposeFileChange}
                  className="hidden"
                />
                {attachments.length > 0 && (
                  <ul className="mt-2 max-h-24 overflow-auto space-y-1 text-sm text-gray-800 dark:text-gray-200">
                    {attachments.map((f) => (
                      <li key={f.name} className="truncate">
                        {fileIcon(f)} {f.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* To / Subject / Body */}
              <input
                type="email"
                placeholder="To"
                value={newEmail.to}
                onChange={(e) =>
                  setNewEmail({ ...newEmail, to: e.target.value })
                }
                className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100"
              />
              <input
                type="text"
                placeholder="Subject"
                value={newEmail.subject}
                onChange={(e) =>
                  setNewEmail({ ...newEmail, subject: e.target.value })
                }
                className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100"
              />
              <textarea
                rows={4}
                placeholder="Message"
                value={newEmail.body}
                onChange={(e) =>
                  setNewEmail({ ...newEmail, body: e.target.value })
                }
                className="w-full p-2 border rounded dark:bg-gray-800 dark:text-gray-100 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition"
              >
                Cancel
              </button>
              <button
                onClick={sendEmail}
                disabled={sending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
