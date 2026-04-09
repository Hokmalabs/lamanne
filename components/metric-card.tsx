import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "accent" | "success" | "warning";
  className?: string;
}

const variantStyles = {
  primary: {
    bg: "bg-lamanne-primary",
    iconBg: "bg-white/20",
    text: "text-white",
    sub: "text-white/70",
  },
  accent: {
    bg: "bg-lamanne-accent",
    iconBg: "bg-white/20",
    text: "text-white",
    sub: "text-white/70",
  },
  success: {
    bg: "bg-lamanne-success",
    iconBg: "bg-white/20",
    text: "text-white",
    sub: "text-white/70",
  },
  warning: {
    bg: "bg-lamanne-warning",
    iconBg: "bg-white/20",
    text: "text-white",
    sub: "text-white/70",
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "primary",
  className,
}: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn("rounded-2xl p-5 flex items-start justify-between", styles.bg, className)}>
      <div className="flex-1">
        <p className={cn("text-sm font-medium", styles.sub)}>{title}</p>
        <p className={cn("text-2xl font-bold mt-1 leading-tight", styles.text)}>{value}</p>
        {subtitle && (
          <p className={cn("text-xs mt-1", styles.sub)}>{subtitle}</p>
        )}
      </div>
      <div className={cn("rounded-xl p-2.5 ml-3", styles.iconBg)}>
        <Icon className={cn("h-6 w-6", styles.text)} />
      </div>
    </div>
  );
}
