// components/widgets/OverviewBoard.jsx
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  parseISO,
  isToday,
  isAfter,
  isBefore,
  addDays,
  format,
} from "date-fns";
import { FiCalendar, FiClock, FiCheckSquare } from "react-icons/fi";

const CONFIG = [
  {
    key: "start",
    title: "Today's Events",
    icon: FiCalendar,
    border: "border-purple-500",
    color: "text-purple-500",
    filterFn: (d, key, today) => isToday(parseISO(d[key])),
  },
  {
    key: "start",
    title: "Upcoming Events",
    icon: FiCalendar,
    border: "border-purple-500",
    color: "text-purple-500",
    filterFn: (d, key, today, limit) => {
      const dt = parseISO(d[key]);
      return isAfter(dt, today) && isBefore(dt, limit);
    },
  },
  {
    key: "date",
    title: "Today's Meetings",
    icon: FiClock,
    border: "border-green-500",
    color: "text-green-500",
    filterFn: (d, key, today) => isToday(parseISO(d[key])),
  },
  {
    key: "date",
    title: "Upcoming Meetings",
    icon: FiClock,
    border: "border-green-500",
    color: "text-green-500",
    filterFn: (d, key, today, limit) => {
      const dt = parseISO(d[key]);
      return isAfter(dt, today) && isBefore(dt, limit);
    },
  },
  {
    key: "dueDate",
    title: "Today's Tasks",
    icon: FiCheckSquare,
    border: "border-blue-500",
    color: "text-blue-500",
    filterFn: (d, key, today) => {
      if (!d[key]) return false;
      return isToday(parseISO(d[key]));
    },
  },
  {
    key: "dueDate",
    title: "Upcoming Tasks",
    icon: FiCheckSquare,
    border: "border-blue-500",
    color: "text-blue-500",
    filterFn: (d, key, today, limit) => {
      if (!d[key]) return false;
      const dt = parseISO(d[key]);
      return isAfter(dt, today) && isBefore(dt, limit);
    },
  },
];

export default function OverviewBoard() {
  const [events, setEvents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    Promise.all([
      axios.get("/api/events"),
      axios.get("/api/meetings"),
      axios.get("/api/tasks"),
    ]).then(([eRes, mRes, tRes]) => {
      setEvents(eRes.data);
      setMeetings(mRes.data);
      setTasks(tRes.data);
    });
  }, []);

  const today = new Date();
  const limit = addDays(today, 7);

  // Map each CONFIG.key to its data array
  const dataMap = {
    start: events,
    date: meetings,
    dueDate: tasks,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-5">
      {CONFIG.map(({ key, title, icon: Icon, border, color, filterFn }) => {
        const list = dataMap[key] || [];
        const items = list
          .filter((d) => filterFn(d, key, today, limit))
          .sort((a, b) => new Date(a[key]) - new Date(b[key]));

        return (
          <div
            key={title}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${border} border-t-4 transition hover:shadow-2xl`}
          >
            <div className="flex items-center p-4">
              <Icon className={`${color} w-6 h-6`} />
              <h3 className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
              {items.length > 0 ? (
                items.map((item) => (
                  <li
                    key={item._id}
                    className="flex justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.title || item.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(parseISO(item[key]), "MMM d, p")}
                    </span>
                  </li>
                ))
              ) : (
                <li className="p-4 text-center text-gray-400 italic">None</li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
