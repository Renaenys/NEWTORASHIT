// app/providers.tsx
"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { GlobalDataProvider } from "@/components/GlobalDataContext";
import { useWebPush } from "@/hooks/useWebPush"; // ← import your hook

export function Providers({ children }: { children: React.ReactNode }) {
  // ← kick off SW registration & subscription on mount
  useWebPush();

  return (
    <SessionProvider>
      <GlobalDataProvider>{children}</GlobalDataProvider>
    </SessionProvider>
  );
}
