"use client";

import { SessionProvider } from "next-auth/react";
import withMembershipGuard from "@/lib/guards/withMembershipGuard";
import SidebarLayout from "@/components/SidebarLayout";
import EmailLayout from "@/components/EmailLayout";

function EmailPage({ session, profile }) {
  return (
    <SidebarLayout user={session.user}>
      <EmailLayout session={session} profile={profile} />
    </SidebarLayout>
  );
}

const ProtectedEmailPage = withMembershipGuard(EmailPage);

export default function EmailWrapper() {
  return (
    <SessionProvider>
      <ProtectedEmailPage />
    </SessionProvider>
  );
}
