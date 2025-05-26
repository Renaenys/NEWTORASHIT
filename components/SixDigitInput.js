"use client";
import { useRef, useState, useEffect } from "react";

export default function SixDigitInput({ onComplete }) {
  const [values, setValues] = useState(["", "", "", "", "", ""]);
  const inputs = useRef([]);

  const handleChange = (i, value) => {
    if (!/^\d?$/.test(value)) return;

    const newValues = [...values];
    newValues[i] = value;
    setValues(newValues);

    if (value && i < 5) inputs.current[i + 1]?.focus();

    if (newValues.every((v) => v.length === 1)) {
      onComplete(newValues.join(""));
    }
  };

  const handleKeyDown = (e, i) => {
    if (e.key === "Backspace" && !values[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (paste.length < 6) return;

    const chars = paste.split("");
    setValues(chars);

    chars.forEach((char, idx) => {
      if (inputs.current[idx]) {
        inputs.current[idx].value = char;
      }
    });

    inputs.current[5]?.focus(); // go to last input
    onComplete(paste); // ✅ pass the correct variable here
    e.preventDefault();
  };

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  return (
    <div className="flex justify-center gap-3">
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="w-14 h-14 text-center text-2xl font-semibold tracking-widest rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      ))}
    </div>
  );
}
