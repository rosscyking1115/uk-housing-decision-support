"use client";

import { useEffect, useId, useRef, useState } from "react";

// A small "ⓘ" button that reveals an explanatory popover. Used on the search
// filters so people can see what each indicator measures and what the weight
// tags (Ignore … Top) actually do. Closes on outside-click and Escape.
export function InfoPopover({
  label,
  children,
  align = "left",
}: {
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrap} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border border-rule2 text-[11px] font-semibold leading-none text-muted transition-colors hover:border-accent hover:text-accent"
      >
        i
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          className={`absolute top-[24px] z-[1000] w-[264px] rounded-[12px] border border-rule2 bg-card p-3.5 text-left shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </span>
  );
}
