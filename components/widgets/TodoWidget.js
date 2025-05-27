// components/widgets/TodoWidget.jsx
"use client";

import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FiCheckSquare, FiSquare, FiPlus, FiTrash2 } from "react-icons/fi";
import { useGlobalData } from "@/components/GlobalDataContext";

export default function TodoWidget() {
  const {
    data: { todos },
    addItem,
    updateItem,
    removeItem,
  } = useGlobalData();
  const [newTitle, setNewTitle] = useState("");

  // 1️⃣ Add a new To-Do
  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const res = await axios.post("/api/todos", { title });
      addItem("todos", res.data); // ← pushes into context.todos
      setNewTitle("");
    } catch {
      Swal.fire("Error", "Could not add todo", "error");
    }
  };

  // 2️⃣ Toggle done
  const handleToggle = async (todo) => {
    try {
      const res = await axios.put("/api/todos", {
        id: todo._id,
        done: !todo.done,
      });
      updateItem("todos", res.data); // ← updates context.todos
    } catch {
      Swal.fire("Error", "Could not update todo", "error");
    }
  };

  // 3️⃣ Delete
  const handleDelete = async (id) => {
    const { isConfirmed } = await Swal.fire({
      icon: "warning",
      text: "Delete this todo?",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!isConfirmed) return;
    try {
      await axios.delete(`/api/todos?id=${id}`);
      removeItem("todos", id); // ← removes from context.todos
    } catch {
      Swal.fire("Error", "Could not delete todo", "error");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 max-w-md">
      <h2 className="text-lg font-semibold dark:text-gray-50 mb-4">
        📝 To-Do List
      </h2>

      <div className="flex space-x-2 mb-4">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New todo…"
          className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded focus:outline-none"
        />
        <button
          onClick={handleAdd}
          className="p-2 bg-green-500 text-white rounded"
        >
          <FiPlus size={20} />
        </button>
      </div>

      <ul className="space-y-2">
        {todos.map((todo) => (
          <li key={todo._id} className="flex items-center space-x-2">
            <button onClick={() => handleToggle(todo)}>
              {todo.done ? (
                <FiCheckSquare className="text-green-500" />
              ) : (
                <FiSquare className="text-gray-400" />
              )}
            </button>
            <span
              className={`flex-1 ${
                todo.done ? "line-through text-gray-500" : "dark:text-gray-100"
              }`}
            >
              {todo.title}
            </span>
            <button onClick={() => handleDelete(todo._id)}>
              <FiTrash2 className="text-red-500" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
