"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Divider } from "@/components/Ornaments";
import { Reveal } from "@/components/Reveal";

type Parts = {
  days: number;
  hours: number;
  mins: number;
  secs: number;
  done: boolean;
};

function diff(target: string): Parts {
  const ms = new Date(target).getTime() - Date.now();
  const c = Math.max(0, ms);
  return {
    days: Math.floor(c / 86400000),
    hours: Math.floor(c / 3600000) % 24,
    mins: Math.floor(c / 60000) % 60,
    secs: Math.floor(c / 1000) % 60,
    done: ms <= 0,
  };
}

export function Countdown({
  targetDate,
  headline,
  subtext,
}: {
  targetDate: string;
  headline: string;
  subtext?: string;
}) {
  const [t, setT] = useState<Parts | null>(null);

  useEffect(() => {
    const tick = () => setT(diff(targetDate));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetDate]);

  const units: [string, number | string][] = [
    ["Days", t ? t.days : "--"],
    ["Hrs", t ? t.hours : "--"],
    ["Mins", t ? t.mins : "--"],
    ["Secs", t ? t.secs : "--"],
  ];

  return (
    <section className="px-6 py-3 text-center">
      <Reveal>
        <p
          data-edit="countdown.headline"
          className="font-display whitespace-nowrap text-base uppercase tracking-[0.14em] sm:text-xl sm:tracking-[0.18em]"
          style={{ color: "var(--c-primary)" }}
        >
          {headline}
        </p>
        <Divider className="my-3" width={80} />
      </Reveal>

      {t?.done ? (
        <p className="font-script text-3xl" style={{ color: "var(--c-secondary)" }}>
          Today is the day!
        </p>
      ) : (
        <div className="mx-auto flex max-w-sm items-stretch justify-center gap-2 sm:gap-3">
          {units.map(([label, value]) => (
            <div
              key={label}
              className="flex flex-1 flex-col items-center rounded-lg py-2.5"
              style={{
                background: "color-mix(in srgb, var(--c-surface) 70%, transparent)",
                boxShadow: "0 6px 16px rgba(40,50,80,0.10)",
                border:
                  "1px solid color-mix(in srgb, var(--c-accent) 20%, transparent)",
              }}
            >
              <div className="h-7 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={String(value)}
                    initial={{ y: 12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -12, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="font-display block text-xl sm:text-2xl"
                    style={{ color: "var(--c-primary)" }}
                  >
                    {typeof value === "number"
                      ? String(value).padStart(2, "0")
                      : value}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span
                className="font-display mt-0.5 text-[9px] uppercase tracking-[0.2em]"
                style={{ color: "var(--c-muted)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {subtext ? (
        <p
          data-edit="countdown.subtext"
          className="font-body mt-3 text-sm italic"
          style={{ color: "var(--c-secondary)" }}
        >
          {subtext}
        </p>
      ) : null}
    </section>
  );
}
