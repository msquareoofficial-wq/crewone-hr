// Powered By Vistech Force
"use client";

const IcAlert = () => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" />
    <path d="M32 20v16" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="32" cy="44" r="2.5" fill="currentColor" />
  </svg>
);

export default function ErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  sub = "An unexpected error occurred. You can try again or go back to the previous page.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  sub?: string;
}) {
  return (
    <div className="wrap">
      <div className="card err-wrap">
        <span className="err-icon"><IcAlert /></span>
        <strong className="err-title">{title}</strong>
        <p className="err-sub">{sub}</p>
        {error.digest && <span className="err-code">Error ID: {error.digest}</span>}
        <div className="err-actions">
          <button className="btn" onClick={reset}>Try again</button>
          <a href="/" className="btn sec">Go home</a>
        </div>
      </div>
    </div>
  );
}
