// components/GlobalDataContext.jsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";

const GlobalDataContext = createContext({
  data: {
    events: [],
    meetings: [],
    todos: [],
    contacts: [],
  },
  addItem: () => {},
  removeItem: () => {},
  updateItem: () => {},
});

export function GlobalDataProvider({ children }) {
  const { data: session, status } = useSession();
  const [data, setData] = useState({
    events: [],
    meetings: [],
    todos: [],
    contacts: [],
  });

  // Fetch all collections once authenticated
  useEffect(() => {
    if (status !== "authenticated") return;

    (async () => {
      try {
        const [eRes, mRes, todoRes, cRes] = await Promise.all([
          axios.get("/api/events"),
          axios.get("/api/meetings"),
          axios.get("/api/todos"),
          axios.get("/api/contacts"),
        ]);
        setData({
          events: eRes.data,
          meetings: mRes.data,
          todos: todoRes.data,
          contacts: cRes.data,
        });
      } catch (err) {
        console.error("GlobalDataProvider load failed:", err);
      }
    })();
  }, [status]);

  // Add a new item to one of the collections
  const addItem = (collection, item) => {
    setData((prev) => ({
      ...prev,
      [collection]: [...prev[collection], item],
    }));
  };

  // Remove an item by _id from a collection
  const removeItem = (collection, id) => {
    setData((prev) => ({
      ...prev,
      [collection]: prev[collection].filter((x) => x._id !== id),
    }));
  };

  // Update an existing item in a collection
  const updateItem = (collection, updated) => {
    setData((prev) => ({
      ...prev,
      [collection]: prev[collection].map((x) =>
        x._id === updated._id ? updated : x
      ),
    }));
  };

  return (
    <GlobalDataContext.Provider
      value={{ data, addItem, removeItem, updateItem }}
    >
      {children}
    </GlobalDataContext.Provider>
  );
}

export const useGlobalData = () => useContext(GlobalDataContext);
