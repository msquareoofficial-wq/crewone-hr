// Powered By Vistech Force
"use client";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Calendar error"
      sub="Could not load your calendar. Try again or check with your admin."
    />
  );
}
