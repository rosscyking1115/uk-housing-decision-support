"use client";

import { useEffect, useState } from "react";

// Flips the `.dark` class on <html> and persists to localStorage. A blocking
// inline script in the layout applies the stored theme before paint (no flash);
// this only handles the toggle + label. Label shows the theme you'd switch to.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("movein-theme", next ? "dark" : "light");
    } catch {
      /* private mode — ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      className="ml-auto inline-flex min-h-[34px] items-center gap-2 rounded-full border border-rule bg-card2 px-3.5 py-[7px] font-mono text-[11px] uppercase tracking-wider text-ink2 hover:text-ink"
      suppressHydrationWarning
    >
      {mounted ? (dark ? "Light" : "Dark") : "Dark"}
    </button>
  );
}
