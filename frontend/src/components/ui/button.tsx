import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold [text-shadow:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/90 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "btn-plasticine focus-visible:ring-0 focus-visible:ring-offset-0",
        secondary:
          "btn-clay-cream transition-[transform,filter] duration-200 ease-out",
        ghost: "btn-plasticine-ghost"
      },
      size: {
        default: "h-12 px-7 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 px-10 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    },
    compoundVariants: [
      { variant: "default", size: "sm", class: "btn-plasticine--sm" },
      { variant: "default", size: "lg", class: "btn-plasticine--lg" }
    ]
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
