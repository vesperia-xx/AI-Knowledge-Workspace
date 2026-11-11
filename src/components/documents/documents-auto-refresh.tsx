"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * There is no realtime channel yet, so a document parked in `pending` or
 * `processing` would stay stale on screen. While a job is in flight, refresh
 * the server component every few seconds; when nothing is active the timer is
 * gone, so an idle workspace makes no requests.
 */
export function DocumentsAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => router.refresh(), 2500);
    return () => window.clearInterval(interval);
  }, [active, router]);

  if (!active) return null;

  return (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      Processing in the background. This list refreshes automatically.
    </p>
  );
}
