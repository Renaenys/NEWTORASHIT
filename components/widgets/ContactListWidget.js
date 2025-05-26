"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function ContactListWidget() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    axios.get("/api/contacts").then(({ data }) => setContacts(data));
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        👥 Contacts
      </h2>
      <ul className="space-y-2 max-h-64 overflow-auto">
        {contacts.map((c) => (
          <li key={c._id} className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {c.phone || "---"} | {c.email || "---"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
