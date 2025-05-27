// app/pages/profile/page.jsx
"use client";

import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useSession, SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/SidebarLayout";

// ——— Add this file for your codes:
import { COUNTRY_CODES } from "@/lib/countryCodes";

function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState({
    name: "",
    countryDial: "",
    phone: "",
    country: "",
    city: "",
    smtp: { host: "", port: "", user: "", pass: "" },
    imap: { host: "", port: "", user: "", pass: "" },
    memberStatus: "",
    memberExpire: "",
    tokenCredit: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/pages/login");
      return;
    }
    if (status !== "authenticated") return;

    Swal.fire({
      title: "Loading profile…",
      didOpen: () => Swal.showLoading(),
      showConfirmButton: false,
    });

    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        // split stored full phone into dial + rest using COUNTRY_CODES
        let dial = "";
        let rest = "";
        if (data.phone) {
          const codes = COUNTRY_CODES.map((c) => c.dial).sort(
            (a, b) => b.length - a.length
          );
          const match = codes.find((code) => data.phone.startsWith(code));
          if (match) {
            dial = match;
            rest = data.phone.slice(match.length);
          } else {
            rest = data.phone;
          }
        }

        setProfile((p) => ({
          ...p,
          name: data.name || "",
          countryDial: dial,
          phone: rest,
          country: data.country || "",
          city: data.city || "",
          smtp: {
            host: data.smtpSetup?.host || "",
            port: data.smtpSetup?.port || "",
            user: data.smtpSetup?.user || "",
            pass: data.smtpSetup?.pass || "",
          },
          imap: {
            host: data.imapSetup?.host || "",
            port: data.imapSetup?.port || 993,
            user: data.imapSetup?.user || "",
            pass: data.imapSetup?.pass || "",
          },
          memberStatus: data.memberStatus || "none",
          memberExpire: data.memberExpire || "",
          tokenCredit: data.tokenCredit || 0,
        }));
      })
      .catch(() => Swal.fire("Error", "Could not load profile", "error"))
      .finally(() => Swal.close());
  }, [status]);

  const handleChange = (field, value) =>
    setProfile((p) => ({ ...p, [field]: value }));
  const handleSmtpChange = (f, v) =>
    setProfile((p) => ({ ...p, smtp: { ...p.smtp, [f]: v } }));
  const handleImapChange = (f, v) =>
    setProfile((p) => ({ ...p, imap: { ...p.imap, [f]: v } }));

  const handleSave = async () => {
    setSaving(true);
    Swal.fire({
      title: "Saving…",
      didOpen: () => Swal.showLoading(),
      showConfirmButton: false,
    });
    try {
      const fullPhone = profile.countryDial + profile.phone;
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, phone: fullPhone }),
      });
      const json = await res.json();
      Swal.fire(
        res.ok ? "Saved!" : "Error",
        res.ok ? "Profile updated" : json.error,
        res.ok ? "success" : "error"
      );
    } catch {
      Swal.fire("Error", "Could not save profile", "error");
    } finally {
      Swal.close();
      setSaving(false);
    }
  };

  if (status !== "authenticated") return null;

  return (
    <SidebarLayout user={session.user}>
      <div className="w-full p-5 bg-gray-100 dark:bg-gray-800 min-h-screen">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg space-y-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            👤 My Profile
          </h1>

          {/* Membership Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Member Status
              </label>
              <p className="text-blue-600 dark:text-blue-400 font-semibold">
                {profile.memberStatus}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Expire Date
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {profile.memberExpire
                  ? new Date(profile.memberExpire).toLocaleDateString()
                  : "-"}
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">
                Token Credit
              </label>
              <p className="text-green-600 dark:text-green-400 font-mono">
                {profile.tokenCredit}
              </p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50">
              📝 Basic Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <input
                type="text"
                placeholder="Your Name"
                value={profile.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
              />

              {/* Phone (code + number) as one full-width row */}
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <div className="flex">
                  {/* Country Dial Select (auto width) */}
                  <select
                    value={profile.countryDial}
                    onChange={(e) =>
                      handleChange("countryDial", e.target.value)
                    }
                    className="
        h-12
        px-4
        border border-r-0 border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
        rounded-l-md
        focus:outline-none focus:ring-2 focus:ring-purple-500
        w-auto
      "
                  >
                    <option value="">Code</option>
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.dial}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {/* Local Number (fills rest) */}
                  <input
                    type="tel"
                    placeholder="1234 5678"
                    value={profile.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="
        flex-1
        h-12
        px-4
        border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
        rounded-r-md
        focus:outline-none focus:ring-2 focus:ring-purple-500
      "
                  />
                </div>
                {profile.phone && !/^\d{4,15}$/.test(profile.phone) && (
                  <p className="mt-1 text-xs text-red-500">
                    Enter a valid number (4–15 digits)
                  </p>
                )}
              </div>

              {/* Country */}
              <input
                type="text"
                placeholder="Country"
                value={profile.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
              />

              {/* City */}
              <input
                type="text"
                placeholder="City"
                value={profile.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* SMTP Settings */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50">
              📧 SMTP Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["host", "port", "user", "pass"].map((f) => (
                <input
                  key={f}
                  type={
                    f === "port"
                      ? "text"
                      : f === "user"
                      ? "email"
                      : f === "pass"
                      ? "password"
                      : "text"
                  }
                  placeholder={`SMTP ${f.charAt(0).toUpperCase() + f.slice(1)}`}
                  value={profile.smtp[f]}
                  onChange={(e) => handleSmtpChange(f, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
                />
              ))}
            </div>
          </div>

          {/* IMAP Settings */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-50">
              📥 IMAP Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["host", "port", "user", "pass"].map((f) => (
                <input
                  key={f}
                  type={
                    f === "port"
                      ? "text"
                      : f === "user"
                      ? "email"
                      : f === "pass"
                      ? "password"
                      : "text"
                  }
                  placeholder={`IMAP ${f.charAt(0).toUpperCase() + f.slice(1)}`}
                  value={profile.imap[f]}
                  onChange={(e) => handleImapChange(f, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
                />
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="text-right">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "💾 Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default function ProfilePageWrapperExport() {
  return (
    <SessionProvider>
      <ProfilePage />
    </SessionProvider>
  );
}
