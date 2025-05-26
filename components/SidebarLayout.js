// components/SidebarLayout.jsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiMenu,
  FiUser,
  FiHome,
  FiMoon,
  FiSun,
  FiMail,
  FiLogOut,
  FiX,
  FiCalendar,
} from "react-icons/fi";

const navItems = [
  { href: "/pages/dashboard", label: "Dashboard", icon: <FiHome size={18} /> },
  { href: "/pages/profile", label: "Profile", icon: <FiUser size={18} /> },
  { href: "/pages/email", label: "Email", icon: <FiMail size={18} /> },
  {
    href: "/pages/calendar",
    label: "Calendar",
    icon: <FiCalendar size={18} />,
  },
];

export default function SidebarLayout({ user, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();

  const shouldShowLabels = !collapsed || isMobile;

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => setCollapsed((prev) => !prev);
  const closeSidebar = () => isMobile && setCollapsed(false);

  return (
    <div className="relative flex min-h-screen bg-gray-200 dark:bg-gradient-to-br from-[#0d1117] to-[#1a1f2e] text-gray-900 dark:text-white">
      {/* MOBILE OVERLAY */}
      {isMobile && collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={closeSidebar}
        ></div>
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed z-40 top-0 left-0 h-screen overflow-y-auto transition-all duration-300 backdrop-blur-md shadow-lg bg-white dark:bg-gray-900/80
        ${
          isMobile
            ? collapsed
              ? "translate-x-0 w-72"
              : "-translate-x-full w-72"
            : collapsed
            ? "w-14"
            : "w-52"
        }`}
      >
        <div className="flex items-center justify-between p-4">
          {!collapsed && !isMobile && (
            <span className="font-bold text-gray-900 dark:text-white text-base">
              👤 Account
            </span>
          )}

          {isMobile && collapsed && (
            <button
              onClick={closeSidebar}
              className="text-gray-900 dark:text-white hover:text-gray-300"
            >
              <FiX size={22} />
            </button>
          )}
        </div>

        {!collapsed && user && !isMobile && (
          <div className="mx-2 mb-4 px-3 py-2 rounded bg-gray-300 dark:bg-gray-800 text-sm text-center">
            <p className="text-gray-900 dark:text-white font-semibold break-words">
              {user.name}
            </p>
            <p className="text-gray-700 dark:text-gray-200 text-xs break-words">
              {user.email}
            </p>
          </div>
        )}

        <nav className="flex flex-col gap-1 px-2 pb-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors duration-200 ${
                  pathname === item.href
                    ? "bg-purple-400 text-gray-900 dark:text-white"
                    : "hover:bg-purple-400 text-gray-900 dark:text-white"
                }`}
                onClick={closeSidebar}
              >
                <div className="min-w-[20px] flex justify-center">
                  {item.icon}
                </div>
                <span
                  className={`${
                    collapsed && !isMobile ? "hidden" : "gray-500space-nowrap"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          ))}

          {/* Theme toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="flex items-center gap-3 p-2 text-gray-900 dark:text-white hover:bg-purple-400 rounded-md transition"
          >
            <div className="min-w-[20px] flex justify-center">
              {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
            </div>
            {shouldShowLabels && (
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            )}
          </button>

          {/* Logout */}
          <form method="post" action="/api/auth/signout">
            <button
              type="submit"
              className="flex items-center gap-3 p-2 text-red-600 hover:bg-red-700 hover:text-gray-900 dark:text-white rounded-md transition"
            >
              <div className="min-w-[20px] flex justify-center">
                <FiLogOut size={18} />
              </div>
              {shouldShowLabels && <span>Logout</span>}
            </button>
          </form>
        </nav>
      </aside>

      {/* CONTENT */}
      <div
        className={`flex flex-col flex-1 min-h-screen z-10 transition-all duration-300 ${
          !isMobile ? (collapsed ? "lg:pl-14" : "lg:pl-52") : ""
        }`}
      >
        <div className="px-4 py-3 flex items-center justify-between bg-white dark:bg-gray-900/80 border-b border-gray-800 shadow-sm backdrop-blur">
          <button
            className="text-gray-900 dark:text-white hover:text-gray-400"
            onClick={toggleSidebar}
          >
            <FiMenu size={22} />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto w-full">{children}</main>
      </div>
    </div>
  );
}
