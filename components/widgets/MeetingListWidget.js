// components/widgets/MeetingListWidget.jsx
"use client";

import React from "react";
import { useGlobalData } from "@/components/GlobalDataContext";
import { parseISO, isAfter } from "date-fns";

export default function MeetingListWidget() {
  const { data } = useGlobalData();
  const now = new Date();

  const upcoming = data.meetings
    .filter((m) => isAfter(parseISO(m.date), now))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-2">Upcoming Meetings</h3>
      <ul className="space-y-1 max-h-40 overflow-y-auto">
        {upcoming.length > 0 ? (
          upcoming.map((m) => (
            <li
              key={m._id}
              className="bg-green-700 rounded px-3 py-2 flex justify-between"
            >
              <span>{m.title}</span>
              <span className="text-xs">
                {new Date(m.date).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))
        ) : (
          <li className="italic opacity-75">No upcoming meetings</li>
        )}
      </ul>
    </div>
  );
}
