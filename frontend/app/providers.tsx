"use client";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { SWRConfig } from "swr";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ revalidateOnFocus: false, dedupingInterval: 2000 }}>
      <ToastProvider>{children}</ToastProvider>
    </SWRConfig>
  );
}
