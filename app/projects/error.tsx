// Powered By Vistech Force
"use client";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Projects error"
      sub="Could not load your projects. Try again or contact your admin if the issue persists."
    />
  );
}
