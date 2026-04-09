import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const barColor =
    clampedValue >= 70
      ? "bg-lamanne-success"
      : clampedValue >= 30
      ? "bg-lamanne-warning"
      : "bg-red-500";

  const trackColor =
    clampedValue >= 70
      ? "bg-lamanne-success/20"
      : clampedValue >= 30
      ? "bg-lamanne-warning/20"
      : "bg-red-100";

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("h-2.5 w-full rounded-full overflow-hidden", trackColor)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-gray-500 text-right">{clampedValue}%</p>
      )}
    </div>
  );
}
