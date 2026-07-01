"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * Floating music control (bottom-right), matching the reference. Starts paused
 * (browsers block autoplay); tapping plays/pauses the track and pulses the icon.
 */
export function MusicToggle({ trackUrl }: { trackUrl?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // start playing when the envelope is opened (dispatched within the user's tap,
  // so the browser allows autoplay)
  useEffect(() => {
    const start = () => {
      const a = audioRef.current;
      if (!a || !trackUrl) return;
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    };
    window.addEventListener("invite:open", start);
    return () => window.removeEventListener("invite:open", start);
  }, [trackUrl]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !trackUrl) {
      setPlaying((p) => !p); // demo: still animate even without a track
      return;
    }
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      {trackUrl ? (
        <audio ref={audioRef} src={trackUrl} loop preload="none" />
      ) : null}
      <motion.button
        onClick={toggle}
        aria-label={playing ? "Pause music" : "Play music"}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
        style={{ background: "var(--c-primary)", color: "var(--c-surface)" }}
      >
        {playing ? (
          <span className="flex items-end gap-[3px]" aria-hidden>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-[3px] rounded-full"
                style={{ background: "currentColor" }}
                animate={{ height: [6, 16, 6] }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </span>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M11 5 6 9H3v6h3l5 4V5Z"
              fill="currentColor"
            />
            <path
              d="M16 9a4 4 0 0 1 0 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        )}
      </motion.button>
    </>
  );
}
