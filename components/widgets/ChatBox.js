// components/widgets/ChatBox.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FiMessageCircle,
  FiX,
  FiList,
  FiSend,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { useGlobalData } from "@/components/GlobalDataContext";

export default function ChatBox() {
  const { addItem } = useGlobalData();
  const [open, setOpen] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(() => {
    const stored = localStorage.getItem("currentSessionId");
    if (stored) return stored;
    const id = Date.now().toString();
    localStorage.setItem("currentSessionId", id);
    return id;
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef();

  // load sessions list
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/chatHistory/sessions");
        setSessions(res.data);
      } catch (e) {
        console.error("Failed loading sessions:", e);
      }
    })();
  }, [sessionId]);

  // load messages for current session
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const res = await axios.get(`/api/chatHistory?sessionId=${sessionId}`);
        setMessages(res.data);
      } catch (e) {
        console.error("Load history failed:", e);
        Swal.fire("Error", "Could not load history", "error");
      }
    })();
    localStorage.setItem("currentSessionId", sessionId);
  }, [sessionId]);

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const newSession = () => {
    const id = Date.now().toString();
    setSessionId(id);
    setMessages([]);
    setShowSessions(false);
  };
  const deleteSession = async () => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      text: "Delete this conversation?",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(`/api/chatHistory/sessions?sessionId=${sessionId}`);
      newSession();
      const res = await axios.get("/api/chatHistory/sessions");
      setSessions(res.data);
    } catch (e) {
      console.error("Delete session failed:", e);
      Swal.fire("Error", "Could not delete session", "error");
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    // 1️⃣ Save user message
    const userMsg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    try {
      await axios.post("/api/chatHistory", {
        sessionId,
        messages: [userMsg],
      });
    } catch (e) {
      console.error("Save userMsg failed:", e);
      Swal.fire("Error", "Could not save your message", "error");
      return;
    }

    // 2️⃣ Call AI
    let reply;
    try {
      const res = await axios.post("/api/langchain", { prompt: text });
      reply = res.data;
    } catch (e) {
      console.error("AI call failed:", e);
      Swal.fire("Error", "AI call failed", "error");
      return;
    }

    // 3️⃣ If plain text response, echo
    if (reply.response) {
      const botMsg = { role: "assistant", content: reply.response };
      setMessages((m) => [...m, botMsg]);
      try {
        await axios.post("/api/chatHistory", {
          sessionId,
          messages: [botMsg],
        });
      } catch (e) {
        console.error("Save botMsg failed:", e);
      }
    }

    // 4️⃣ Handle function call
    if (reply.action && reply.params) {
      const maps = {
        create_event: { url: "/api/events", type: "events", label: "Event" },
        create_meeting: {
          url: "/api/meetings",
          type: "meetings",
          label: "Meeting",
        },
        create_task: { url: "/api/tasks", type: "tasks", label: "Task" },
        create_contact: {
          url: "/api/contacts",
          type: "contacts",
          label: "Contact",
        },
      };
      const { url, type, label } = maps[reply.action];
      // keep local-datetime strings
      if (reply.params.date) {
        /* leave as-is: "YYYY-MM-DDTHH:mm" */
      }
      if (reply.params.start) {
        /* leave as-is */
      }

      const html = Object.entries(reply.params)
        .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
        .join("<br>");

      const { isConfirmed } = await Swal.fire({
        title: `Create ${label}`,
        html,
        showCancelButton: true,
        confirmButtonText: "Save",
      });
      if (!isConfirmed) return;

      try {
        const saveRes = await axios.post(url, reply.params);
        Swal.fire("Saved!", `${label} created.`, "success");
        // 5️⃣ update context
        addItem(type, saveRes.data);

        // echo a confirmation in chat
        const notice = {
          role: "assistant",
          content: `${label} “${
            saveRes.data.title || saveRes.data.name
          }” saved.`,
        };
        setMessages((m) => [...m, notice]);
        await axios.post("/api/chatHistory", {
          sessionId,
          messages: [notice],
        });
      } catch (e) {
        console.error(`Save ${label} failed:`, e);
        Swal.fire("Error", `Could not save ${label}`, "error");
      }
    }
  };

  // ─── render ─────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-indigo-600 text-white rounded-full shadow-lg"
      >
        <FiMessageCircle size={24} />
      </button>
    );
  }
  return (
    <>
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="relative flex bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden"
          style={{ width: 800, height: 500 }}
        >
          {showSessions && (
            <aside className="w-64 bg-gray-100 dark:bg-gray-800 p-2 overflow-y-auto">
              <div className="flex justify-between mb-2 px-2">
                <span className="font-bold">Conversations</span>
                <button onClick={newSession}>
                  <FiPlus />
                </button>
              </div>
              {sessions.map((s) => (
                <div
                  key={s.sessionId}
                  onClick={() => setSessionId(s.sessionId)}
                  className={`px-2 py-1 truncate cursor-pointer rounded ${
                    s.sessionId === sessionId
                      ? "bg-indigo-200 dark:bg-indigo-700"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {s.title || "Untitled"}
                </div>
              ))}
            </aside>
          )}

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between bg-indigo-600 text-white p-3">
              <div className="flex items-center space-x-2">
                <button onClick={() => setShowSessions((v) => !v)}>
                  <FiList />
                </button>
                <span className="font-semibold">Chat</span>
              </div>
              <div className="flex space-x-2">
                <button onClick={deleteSession}>
                  <FiTrash2 />
                </button>
                <button onClick={() => setOpen(false)}>
                  <FiX />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "text-right" : "text-left"}
                >
                  <span
                    className={`inline-block px-3 py-2 rounded ${
                      m.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 dark:text-white"
                    }`}
                  >
                    {m.content}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="flex items-center p-3 border-t border-gray-200 dark:border-gray-700">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message…"
                className="flex-1 px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 focus:outline-none text-sm"
              />
              <button
                onClick={sendMessage}
                className="ml-2 p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                <FiSend />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
