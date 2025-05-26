// app/calendar/page.jsx
"use client";

import { SessionProvider } from "next-auth/react";
import withMembershipGuard from "@/lib/guards/withMembershipGuard";
import SidebarLayout from "@/components/SidebarLayout";
import CalendarWidget from "@/components/widgets/CalendarWidget";

function CalendarPage({ session, profile }) {
  return (
    <SidebarLayout user={session.user}>
      <div className="container mx-auto px-4 py-6">
        <CalendarWidget fullPage />
      </div>
    </SidebarLayout>
  );
}

const ProtectedCalendar = withMembershipGuard(CalendarPage);

export default function CalendarWrapper() {
  return (
    <SessionProvider>
      <ProtectedCalendar />
    </SessionProvider>
  );
}
