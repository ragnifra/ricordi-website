"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 30_000;

// Mounted only while a product shows as "reserved". Stripe's back button
// navigates via browser history rather than hitting a cancel_url, so there's
// no reliable server-side signal that a checkout was abandoned — this polls
// the page instead, so the moment the reservation lapses (read-time expiry
// in catalog.ts) or is otherwise released, the visitor sees the Buy button
// without needing to reload manually. Unmounts itself once the parent stops
// rendering it (status no longer "reserved"), which clears the interval.
export function ReservedAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
