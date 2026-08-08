"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "lamanne_intro_seen";
const RING_SIZE = 160;
const STROKE_WIDTH = 8;
const RING_ANIM_MS = 1200;
const HOLD_MS = 1600;
const FADE_MS = 400;
const REDUCED_HOLD_MS = 500;

export default function AppIntro() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [fillPct, setFillPct] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage indisponible : on affiche quand même l'intro
    }

    if (alreadySeen) return;

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }

    setVisible(true);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduce);

    if (reduce) {
      setFillPct(100);
      const holdTimer = setTimeout(() => setFading(true), REDUCED_HOLD_MS);
      const unmountTimer = setTimeout(() => setVisible(false), REDUCED_HOLD_MS + FADE_MS);
      return () => { clearTimeout(holdTimer); clearTimeout(unmountTimer); };
    }

    const fillFrame = requestAnimationFrame(() => setFillPct(100));
    const holdTimer = setTimeout(() => setFading(true), HOLD_MS);
    const unmountTimer = setTimeout(() => setVisible(false), HOLD_MS + FADE_MS);

    return () => {
      cancelAnimationFrame(fillFrame);
      clearTimeout(holdTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!visible) return null;

  const radius = (RING_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (fillPct / 100) * circumference;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity"
      style={{
        background: "radial-gradient(circle at 50% 40%, #15693F 0%, #093721 100%)",
        opacity: fading ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
        pointerEvents: fading ? "none" : "auto",
      }}
      aria-hidden="true"
    >
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
          <defs>
            <linearGradient id="app-intro-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F5132" />
              <stop offset="100%" stopColor="#F2A900" />
            </linearGradient>
          </defs>
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={STROKE_WIDTH}
          />
          <g transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}>
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={radius}
              fill="none"
              stroke="url(#app-intro-gradient)"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition: reducedMotion ? "none" : `stroke-dashoffset ${RING_ANIM_MS}ms cubic-bezier(.34,1.2,.4,1)`,
              }}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-master.svg" width={72} height={72} alt="" />
        </div>
      </div>

      <p className="font-sora font-black text-2xl tracking-wide mt-5" style={{ color: "#F2A900" }}>
        LAMANNE
      </p>
      <p className="text-xs mt-1" style={{ color: "rgba(242,169,0,0.6)" }}>
        Cotisation progressive
      </p>
    </div>
  );
}
