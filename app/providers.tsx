// app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { GlobalDataProvider } from "@/components/GlobalDataContext";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GlobalDataProvider>
        {children}
      </GlobalDataProvider>
    </SessionProvider>
  );
}
