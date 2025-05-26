// components/widgets/EventListWidget.jsx
"use client";

import React from "react";
import { useGlobalData } from "@/components/GlobalDataContext";
import { parseISO, isAfter } from "date-fns";

export default function EventListWidget() {
  const { data } = useGlobalData();
  const now = new Date();

  const upcoming = data.events
    .filter((e) => isAfter(parseISO(e.start), now))
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  return (
    <div className="bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-2">Upcoming Events</h3>
      <ul className="space-y-1 max-h-40 overflow-y-auto">
        {upcoming.length > 0 ? (
          upcoming.map((e) => (
            <li
              key={e._id}
              className="bg-purple-700 rounded px-3 py-2 flex justify-between"
            >
              <span>{e.title}</span>
              <span className="text-xs">
                {new Date(e.start).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))
        ) : (
          <li className="italic opacity-75">No upcoming events</li>
        )}
      </ul>
    </div>
  );
}
