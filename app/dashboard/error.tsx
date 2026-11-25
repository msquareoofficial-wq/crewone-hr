// Powered By Vistech Force
"use client";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Dashboard error"
      sub="Could not load your dashboard. Check your connection and try again."
    />
  );
}
