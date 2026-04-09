import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-lamanne-primary text-white",
        accent: "border-transparent bg-lamanne-accent text-white",
        secondary: "border-transparent bg-lamanne-light text-lamanne-primary",
        success: "border-transparent bg-lamanne-success/20 text-lamanne-success",
        warning: "border-transparent bg-lamanne-warning/20 text-lamanne-warning",
        danger: "border-transparent bg-red-100 text-red-700",
        outline: "border-lamanne-primary text-lamanne-primary bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
