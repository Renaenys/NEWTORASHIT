// components/widgets/CalendarWidget.jsx
"use client";

import React, { useRef, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import Swal from "sweetalert2";
import { FiChevronLeft, FiChevronRight, FiPlus } from "react-icons/fi";
import axios from "axios";
import { useGlobalData } from "@/components/GlobalDataContext";

export default function CalendarWidget({ fullPage = false }) {
  const calendarRef = useRef(null);
  const { data, addItem, removeItem } = useGlobalData();

  // 1️⃣ Build only events + meetings
  const items = useMemo(() => {
    const evts = data.events.map((e) => ({
      id: e._id,
      title: e.title,
      start: e.start,
      backgroundColor: "#4F46E5",
      type: "events",
    }));
    const meets = data.meetings.map((m) => ({
      id: m._id,
      title: m.title,
      start: m.date,
      backgroundColor: "#059669",
      type: "meetings",
    }));
    return [...evts, ...meets];
  }, [data.events, data.meetings]);

  // 2️⃣ Local state
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "event",
    title: "",
    dateTime: new Date().toISOString().slice(0, 16),
  });

  // 3️⃣ Filter by search
  const filtered = useMemo(
    () =>
      items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  // 4️⃣ Calendar nav
  const api = () => calendarRef.current.getApi();
  const prev = () => api().prev();
  const next = () => api().next();
  const today = () => api().today();

  // 5️⃣ Click → details + delete
  const onEventClick = ({ event }) => {
    const route = event.extendedProps.type; // "events" or "meetings"
    Swal.fire({
      title: event.title,
      html: `
        <p><strong>Type:</strong> ${route.slice(0, -1)}</p>
        <p><strong>Date:</strong> ${event.start.toLocaleString()}</p>
      `,
      icon: "info",
      showDenyButton: true,
      confirmButtonText: "Close",
      denyButtonText: "Delete",
    }).then(async (res) => {
      if (res.isDenied) {
        await axios.delete(`/api/${route}?id=${event.id}`);
        removeItem(route, event.id);
        today();
        Swal.fire("Deleted!", `${event.title} removed.`, "success");
      }
    });
  };

  // 6️⃣ Tooltip styling
  const onEventDidMount = ({ el, event }) => {
    el.style.cursor = "pointer";
    el.title = `${event.title}\n${event.start.toLocaleString()}`;
  };

  // 7️⃣ Open / close “New” modal
  const openModal = () => {
    setForm({
      type: "event",
      title: "",
      dateTime: new Date().toISOString().slice(0, 16),
    });
    setOpen(true);
  };
  const closeModal = () => setOpen(false);

  // 8️⃣ Submit new Event or Meeting
  const onSubmit = async (e) => {
    e.preventDefault();
    let payload, routeKey;

    if (form.type === "event") {
      payload = { title: form.title, start: form.dateTime };
      routeKey = "events";
    } else {
      payload = { title: form.title, date: form.dateTime };
      routeKey = "meetings";
    }

    const res = await axios.post(`/api/${routeKey}`, payload);
    addItem(routeKey, res.data);
    closeModal();
    today();
    Swal.fire("Saved", `${form.title} added.`, "success");
  };

  return (
    <>
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow p-4 ${
          fullPage ? "min-h-screen" : ""
        }`}
      >
        {/* Header: Search + Nav + New */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-4">
          <input
            type="search"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/3 px-3 py-2 mb-2 md:mb-0 border rounded bg-gray-100 dark:bg-gray-700 focus:outline-none"
          />
          <div className="flex items-center space-x-2">
            <button
              onClick={prev}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={today}
              className="px-3 py-1 bg-indigo-600 text-white rounded"
            >
              Today
            </button>
            <button
              onClick={next}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded"
            >
              <FiChevronRight />
            </button>
            <button
              onClick={openModal}
              className="flex items-center px-3 py-1 bg-green-500 text-white rounded"
            >
              <FiPlus className="mr-1" /> New
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div
          className={`rounded-lg overflow-hidden border ${
            fullPage ? "h-[75vh]" : "h-80"
          }`}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            events={filtered}
            eventClick={onEventClick}
            eventDidMount={onEventDidMount}
            dayMaxEventRows={3}
            height="100%"
            aspectRatio={fullPage ? 1.3 : 1.2}
            timeZone="local"
            eventTimeFormat={{
              hour: "numeric",
              minute: "2-digit",
              meridiem: "short",
            }}
          />
        </div>
      </div>

      {/* New Event/Meeting Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 dark:text-white">
              New {form.type.charAt(0).toUpperCase() + form.type.slice(1)}
            </h3>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm dark:text-gray-300">Type</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="mt-1 w-full bg-gray-100 dark:bg-gray-700 rounded p-2"
                >
                  <option value="event">Event</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-sm dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="mt-1 w-full bg-gray-100 dark:bg-gray-700 rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm dark:text-gray-300">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.dateTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateTime: e.target.value }))
                  }
                  className="mt-1 w-full bg-gray-100 dark:bg-gray-700 rounded p-2"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
