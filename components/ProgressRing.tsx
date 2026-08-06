"use client";

import { useEffect, useId, useState } from "react";

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  label,
}: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [displayValue, setDisplayValue] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const gradientId = `progress-ring-gradient-${useId()}`;

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);

    if (mql.matches) {
      setDisplayValue(clamped);
      return;
    }

    const frame = requestAnimationFrame(() => setDisplayValue(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  const offset = circumference - (displayValue / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        role="img"
        aria-label={`${Math.round(clamped)}% payé`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--lamanne-green)" />
            <stop offset="100%" stopColor="var(--lamanne-gold)" />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--lamanne-mist)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: reducedMotion
                ? "none"
                : "stroke-dashoffset 0.9s cubic-bezier(.34,1.2,.4,1)",
            }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-sora font-bold leading-none" style={{ fontSize: size * 0.22 }}>
          {Math.round(displayValue)}%
        </span>
        {label && (
          <span className="mt-1 text-[11px] leading-none" style={{ color: "#6B7280" }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
