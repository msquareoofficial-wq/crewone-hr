// Powered By Vistech Force
"use client";
export default function LogoutButton() {
  return (
    <button
      type="button"
      className="logout-btn"
      data-tip="Logout"
      aria-label="Logout"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18.36 6.64a9 9 0 1 1-12.72 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </svg>
    </button>
  );
}
