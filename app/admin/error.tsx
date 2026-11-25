// Powered By Vistech Force
"use client";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Admin panel error"
      sub="Something went wrong loading this admin page. Try again or navigate to another section."
    />
  );
}
