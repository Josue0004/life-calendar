"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/** ====== CONSTANTS (fixed to your request) ====== */
const BIRTH = new Date(2004, 4, 6, 8, 0, 0); // Year, Month(0=Jan, so 4=May), Day, 08:00 local
const EXPECTANCY_YEARS = 88;
const COLS = 52; // 52 week-columns per year
const MS = {
  sec: 1000,
  min: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  yearAvg: 365.2425 * 24 * 3_600_000,
};

type WeekCell = {
  i: number;
  start: Date;
  end: Date;
  status: "past" | "current" | "future";
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const fmt2 = (n: number) => n.toLocaleString(undefined);

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function diffMs(a: Date, b: Date) {
  return b.getTime() - a.getTime();
}

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}

/** Theme management (no SSR mismatch): default light, persist in localStorage */
function useTheme() {
  const [dark, setDark] = useState(false);
  // Load stored preference on mount
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
      if (saved === "dark") setDark(true);
      else if (saved === "light") setDark(false);
      else {
        // Fallback to OS preference if no saved theme
        if (typeof window !== "undefined" && window.matchMedia) {
          setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
      }
    } catch {}
  }, []);
  // Apply & persist
  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (dark) root.classList.add("dark");
      else root.classList.remove("dark");
      try {
        localStorage.setItem("theme", dark ? "dark" : "light");
      } catch {}
    }
  }, [dark]);
  return { dark, setDark };
}

export default function Page() {
  const now = useNow(1000);
  const { dark, setDark } = useTheme();

  /** ====== CORE LIFE MATH (exact from birth moment) ====== */
  const totalWeeks = EXPECTANCY_YEARS * COLS;
  const livedWeeks = Math.max(0, Math.floor(diffMs(BIRTH, now) / (7 * MS.day)));
  const remainingWeeks = Math.max(0, totalWeeks - livedWeeks);
  const pctLived = (livedWeeks / totalWeeks) * 100;

  /** Age breakdown to seconds (live): */
  const delta = diffMs(BIRTH, now);
  const yearsExact = delta / MS.yearAvg;
  const ageDays = Math.floor(delta / MS.day);
  const ageHours = Math.floor(delta / MS.hour);
  // For the detailed ticking display:
  const totalSeconds = Math.floor(delta / MS.sec);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);
  // We’ll show yearsExact with precision and also the ticking D:H:M:S since birth.

  /** Week cells exactly from birth moment (no “start of week Monday” drift) */
  const weeksData = useMemo<WeekCell[]>(() => {
    const arr: WeekCell[] = [];
    for (let i = 0; i < totalWeeks; i++) {
      const start = addDays(BIRTH, i * 7);
      const end = addDays(start, 6);
      let status: WeekCell["status"] = "future";
      if (i < livedWeeks) status = "past";
      else if (i === livedWeeks) status = "current";
      arr.push({ i, start, end, status });
    }
    return arr;
  }, [totalWeeks, livedWeeks]);

  /** Years to render (one row per expected year) */
  const years = useMemo(() => {
    const out: number[] = [];
    for (let r = 0; r < EXPECTANCY_YEARS; r++) out.push(BIRTH.getFullYear() + r);
    return out;
  }, []);

  /** Tooltip state (mouse-positioned) */
  const hoverRef = useRef<{ x: number; y: number; show: boolean; content: React.ReactNode | null }>({
    x: 0,
    y: 0,
    show: false,
    content: null,
  });
  const [, setHoverTick] = useState(0);

  function onCellMouseMove(e: React.MouseEvent<HTMLButtonElement>, w: WeekCell) {
    hoverRef.current = {
      x: e.clientX,
      y: e.clientY,
      show: true,
      content: (
        <div>
          <div className="font-medium">Week {w.i + 1}</div>
          <div className="text-neutral-600 dark:text-neutral-300">
            {w.start.toDateString()} <span className="px-1">→</span> {w.end.toDateString()}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wide">{w.status}</div>
        </div>
      ),
    };
    setHoverTick((t) => t + 1);
  }
  function onCellLeave() {
    hoverRef.current.show = false;
    setHoverTick((t) => t + 1);
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Life Calendar</h1>
            <p className="text-neutral-600 dark:text-neutral-300 mt-1 max-w-prose">
              Fixed birth: <span className="font-medium">May 6, 2004, 08:00</span> • Life expectancy:{" "}
              <span className="font-medium">{EXPECTANCY_YEARS} years</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle dark mode"
            >
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </div>

        {/* Live stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Age (years, exact)</div>
            <div className="mt-1 text-3xl font-semibold leading-tight tabular-nums">{yearsExact.toFixed(8)}</div>
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {fmt2(ageDays)} days • {fmt2(ageHours)} hours
            </div>
          </div>

          <div className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">Since birth (live)</div>
            <div className="mt-1 text-xl font-semibold leading-tight tabular-nums">
              {fmt2(days)}d : {String(hours).padStart(2, "0")}h : {String(minutes).padStart(2, "0")}m :{" "}
              {String(seconds).padStart(2, "0")}s
            </div>
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Updates every second</div>
          </div>

          <div className="rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <div>Life progress</div>
              <div className="tabular-nums">{pctLived.toFixed(2)}%</div>
            </div>
            <div className="w-full h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-black/80 dark:bg-white/90"
                style={{ width: `${clamp(pctLived, 0, 100)}%` }}
                aria-label={`Progress ${pctLived.toFixed(2)}%`}
              />
            </div>
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {fmt2(livedWeeks)} weeks lived • {fmt2(remainingWeeks)} weeks left (approx)
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-3 text-sm items-center">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-neutral-900 dark:bg-neutral-100" /> Past
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-neutral-400 dark:bg-neutral-500" /> Current week
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-neutral-200 dark:bg-neutral-800" /> Future
          </div>
        </div>

        {/* Grid — row per year, decade separators */}
        <div className="mt-4">
          <div className="w-full rounded-2xl border bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-4">
            <div className="flex flex-col">
              {Array.from({ length: EXPECTANCY_YEARS }).map((_, r) => {
                const year = years[r];
                const start = r * COLS;
                const end = start + COLS;
                const rowWeeks = weeksData.slice(start, end);
                const isDecadeDivider = r > 0 && r % 10 === 0;

                return (
                  <React.Fragment key={r}>
                    {isDecadeDivider && (
                      <div className="my-[6px] h-px bg-neutral-300/60 dark:bg-neutral-700/60" />
                    )}
                    <div className="grid grid-cols-[auto,1fr] items-center gap-2">
                      <div className="w-12 text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {year}
                      </div>
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${COLS}, minmax(8px, 1fr))`,
                          columnGap: 6,
                          rowGap: 0,
                        }}
                        role="row"
                        aria-label={`Year ${year}`}
                      >
                        {rowWeeks.map((w) => {
                          let cls = "h-3 rounded-[3px] outline-none";
                          if (w.status === "past") cls += " bg-neutral-900 dark:bg-neutral-100";
                          else if (w.status === "current") cls += " bg-neutral-400 dark:bg-neutral-500 animate-pulse";
                          else cls += " bg-neutral-200 dark:bg-neutral-800";

                          return (
                            <button
                              key={w.i}
                              className={cls}
                              onMouseMove={(e) => onCellMouseMove(e, w)}
                              onMouseLeave={onCellLeave}
                              onMouseEnter={(e) => onCellMouseMove(e, w)}
                              onBlur={onCellLeave}
                              title={`Week ${w.i + 1}: ${w.start.toDateString()} → ${w.end.toDateString()}`}
                              aria-label={`Week ${w.i + 1} ${w.status}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer helper */}
        <div className="mt-6 text-xs text-neutral-500 dark:text-neutral-400 max-w-prose">
          Weeks are counted from your birth moment (May 6, 2004, 08:00). Grid uses 52 columns/year. Calculations use
          local time and average year length (365.2425 days).
        </div>
      </div>

      {/* Floating tooltip layer */}
      {hoverRef.current.show && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-xl border bg-white dark:bg-neutral-900 text-xs p-2 shadow-lg"
          style={{ left: hoverRef.current.x + 12, top: hoverRef.current.y + 12 }}
          role="tooltip"
        >
          {hoverRef.current.content}
        </div>
      )}
    </div>
  );
}
