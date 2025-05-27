// app/dashboard/page.jsx
"use client";

import { SessionProvider } from "next-auth/react";
import withMembershipGuard from "@/lib/guards/withMembershipGuard";
import SidebarLayout from "@/components/SidebarLayout";
import TodoWidget from "@/components/widgets/TodoWidget";
import MeetingListWidget from "@/components/widgets/MeetingListWidget";
import EventListWidget from "@/components/widgets/EventListWidget";
import ChatBox from "@/components/widgets/ChatBox";
import Forecast from "@/components/widgets/ForecastWidget";

function DashboardPage({ session }) {
  return (
    <SidebarLayout user={session.user}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
        {/* Today's / Upcoming Tasks */}
        <TodoWidget />

        {/* Upcoming Meetings */}
        <MeetingListWidget />

        {/* Upcoming Events */}
        <EventListWidget />

        {/* Weather */}
        <Forecast />
      </div>

      {/* Chat bubble always rendered at root of dashboard */}
      <ChatBox />
    </SidebarLayout>
  );
}

const ProtectedDashboard = withMembershipGuard(DashboardPage);

export default function DashboardWrapper() {
  return (
    <SessionProvider>
      <ProtectedDashboard />
    </SessionProvider>
  );
}
