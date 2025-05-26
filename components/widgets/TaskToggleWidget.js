// components/widgets/TaskToggleWidget.jsx
"use client";

import React, { useState } from "react";
import { useGlobalData } from "@/components/GlobalDataContext";
import { parseISO, isToday, isAfter, addDays, format } from "date-fns";
import { FiRefreshCw, FiCheck, FiSquare } from "react-icons/fi";
import axios from "axios";

export default function TaskToggleWidget() {
  const { data, updateItem } = useGlobalData();
  const [showUpcoming, setShowUpcoming] = useState(false);

  const now = new Date();
  const weekAhead = addDays(now, 7);

  // 1️⃣ filter and sort tasks, falling back to createdAt if dueDate is missing
  const tasks = data.tasks
    .map((t) => {
      // determine the date we'll use
      const raw = t.dueDate || t.createdAt;
      return { ...t, _displayDate: raw };
    })
    .filter((t) => {
      const dt = parseISO(t._displayDate);
      return showUpcoming ? dt > now && dt <= weekAhead : isToday(dt);
    })
    .sort((a, b) => {
      const da = parseISO(a._displayDate);
      const db = parseISO(b._displayDate);
      return da - db;
    });

  const toggleCompleted = async (task) => {
    try {
      const res = await axios.put("/api/tasks", {
        id: task._id,
        completed: !task.completed,
      });
      updateItem("tasks", res.data);
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">
          {showUpcoming ? "Upcoming Tasks" : "Today's Tasks"}
        </h3>
        <button
          onClick={() => setShowUpcoming((v) => !v)}
          className="text-sm underline hover:text-gray-200"
        >
          {showUpcoming ? "Show Today" : "Show Upcoming"}
        </button>
      </div>

      <ul className="space-y-1 max-h-40 overflow-y-auto">
        {tasks.length > 0 ? (
          tasks.map((t) => {
            const dt = parseISO(t._displayDate);
            return (
              <li
                key={t._id}
                className="bg-blue-700 rounded px-3 py-2 flex justify-between items-center"
              >
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleCompleted(t)}
                    className="focus:outline-none"
                  >
                    {t.completed ? (
                      <FiCheck className="text-green-300 w-5 h-5" />
                    ) : (
                      <FiSquare className="text-white w-5 h-5" />
                    )}
                  </button>
                  <span
                    className={t.completed ? "line-through opacity-75" : ""}
                  >
                    {t.title}
                  </span>
                </div>
                <span className="text-xs">{format(dt, "MMM d, p")}</span>
              </li>
            );
          })
        ) : (
          <li className="italic opacity-75">
            No {showUpcoming ? "upcoming" : "today’s"} tasks
          </li>
        )}
      </ul>

      <div className="mt-2 text-right">
        <button
          onClick={() => window.location.reload()}
          className="p-1 rounded hover:bg-blue-500"
          aria-label="Refresh tasks"
        >
          <FiRefreshCw />
        </button>
      </div>
    </div>
  );
}
