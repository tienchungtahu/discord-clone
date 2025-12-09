"use client";

import { usePresence } from "@/components/hooks/use-presence";

export const PresenceProvider = ({ children }: { children: React.ReactNode }) => {
  usePresence();
  
  return <>{children}</>;
};
