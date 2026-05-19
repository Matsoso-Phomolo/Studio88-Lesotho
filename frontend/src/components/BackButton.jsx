import React from "react";

export default function BackButton({ fallback = "/", onFallback }) {
  function handleBack() {
    if (window.history.state?.studio88CanGoBack && window.history.length > 1) {
      window.history.back();
      return;
    }

    if (onFallback) {
      onFallback();
      return;
    }

    window.location.href = fallback;
  }

  return (
    <button
      onClick={handleBack}
      className="mb-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-white/20"
    >
      ← Back
    </button>
  );
}
