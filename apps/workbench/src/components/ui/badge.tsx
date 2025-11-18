import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-red-500 text-white shadow hover:bg-red-600",
        outline: "text-foreground",
        blue: "border-blue-200 bg-blue-50 text-blue-700",
        purple: "border-purple-200 bg-purple-50 text-purple-700",
        green: "border-green-200 bg-green-50 text-green-700",
        orange: "border-orange-200 bg-orange-50 text-orange-700",
        pink: "border-pink-200 bg-pink-50 text-pink-700",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
        gray: "border-gray-200 bg-gray-50 text-gray-700",
        yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
        red: "border-red-200 bg-red-50 text-red-700",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
