"use client";

import { useEffect, useState } from "react";

// Renders on its own line; all words share one grid cell so the height never changes and nothing below reflows.
export function RotatingText({ words, intervalMs = 2800 }: { words: string[]; intervalMs?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((current) => (current + 1) % words.length), intervalMs);
    return () => window.clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span className="grid justify-items-center" aria-hidden="true">
      {words.map((word, i) => (
        <span
          key={word}
          className={`transition-opacity duration-500 [grid-area:1/1] ${i === index ? "opacity-100" : "opacity-0"}`}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
