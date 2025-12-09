"use client";

import { useEffect, useRef } from "react";
import axios from "axios";

type UserStatus = "ONLINE" | "IDLE" | "DND" | "OFFLINE";

export const usePresence = () => {
  const statusRef = useRef<UserStatus>("OFFLINE");
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const updateStatus = async (status: UserStatus) => {
    if (statusRef.current === status) return;
    
    try {
      await axios.patch("/api/users/status", { status });
      statusRef.current = status;
    } catch (error) {
      console.error("[Presence] Failed to update status:", error);
    }
  };

  const resetIdleTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (statusRef.current === "IDLE") {
      updateStatus("ONLINE");
    }

    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set idle after 5 minutes of inactivity
    idleTimeoutRef.current = setTimeout(() => {
      if (statusRef.current === "ONLINE") {
        updateStatus("IDLE");
      }
    }, 5 * 60 * 1000); // 5 minutes
  };

  useEffect(() => {
    // Set online when component mounts
    updateStatus("ONLINE");

    // Track user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    
    const handleActivity = () => {
      resetIdleTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus("IDLE");
      } else {
        updateStatus("ONLINE");
        resetIdleTimer();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Handle before unload (closing tab/browser)
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable delivery
      navigator.sendBeacon(
        "/api/users/status",
        JSON.stringify({ status: "OFFLINE" })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Initial idle timer
    resetIdleTimer();

    // Heartbeat to keep status updated
    const heartbeat = setInterval(() => {
      if (statusRef.current !== "OFFLINE" && statusRef.current !== "DND") {
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        if (timeSinceActivity > 5 * 60 * 1000) {
          updateStatus("IDLE");
        }
      }
    }, 60 * 1000); // Check every minute

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      clearInterval(heartbeat);
      
      // Set offline when unmounting
      updateStatus("OFFLINE");
    };
  }, []);

  return { updateStatus };
};
