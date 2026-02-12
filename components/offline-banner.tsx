"use client";

import { useCallback, useEffect, useState } from "react";
import { getSyncQueue } from "@/hooks/use-indexed-db";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      setPendingCount(queue.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    setShowBanner(!online);
    if (!online) refreshPending();

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      refreshPending();
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      refreshPending();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(() => {
      if (!navigator.onLine) refreshPending();
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [refreshPending]);

  const message = isOnline
    ? "Connection restored - syncing..."
    : pendingCount > 0
      ? `Offline - ${pendingCount} change${pendingCount !== 1 ? "s" : ""} pending`
      : "You are currently offline";

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform rounded-lg border px-4 py-2 text-sm shadow-lg transition-all duration-300 ease-in-out ${
        showBanner
          ? "opacity-100 translate-y-0"
          : "pointer-events-none opacity-0 translate-y-4"
      } ${
        isOnline
          ? "border-green-600/30 bg-green-950/60 text-green-300 backdrop-blur"
          : "border-neutral-800 bg-neutral-950/60 text-neutral-300 backdrop-blur"
      }`}
    >
      {message}
    </div>
  );
}
