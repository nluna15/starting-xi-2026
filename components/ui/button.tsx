import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------------------
   Button — handoff §5
   - Always uppercase, condensed, 0.1em tracking, 800 weight (icon variant
     opts out of the label styling).
   - Focus is always visible: 2px accent border emulated via ring + accent-soft
     halo. Never remove focus styles.
   ----------------------------------------------------------------------------- */
const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "font-condensed font-extrabold uppercase tracking-[0.1em]",
    "transition-[background-color,color,box-shadow,transform,border-color] duration-150 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft",
    "disabled:pointer-events-none disabled:cursor-not-allowed",
    "active:translate-y-0",
  ),
  {
    variants: {
      variant: {
        primary: cn(
          "rounded-pill bg-accent text-accent-ink shadow-2",
          "hover:-translate-y-px hover:bg-accent-deep hover:shadow-3",
          "active:bg-accent-deep active:shadow-1",
          "focus-visible:ring-offset-0",
          "disabled:bg-ink-mute disabled:opacity-70 disabled:shadow-none disabled:hover:translate-y-0",
        ),
        secondary: cn(
          "rounded-pill border border-line-strong bg-transparent text-ink",
          "hover:border-ink-3 hover:bg-surface-2",
          "active:bg-bg-sunk",
          "focus-visible:border-accent",
          "disabled:border-dashed disabled:border-line disabled:text-ink-mute",
        ),
        ghost: cn(
          "rounded-pill bg-transparent text-ink-3",
          "hover:bg-surface-2 hover:text-ink",
          "active:bg-bg-sunk",
          "focus-visible:text-ink focus-visible:ring-offset-0",
          "disabled:text-ink-mute",
        ),
        outline: cn(
          "rounded-pill border border-line-strong bg-transparent text-ink",
          "hover:border-ink-3 hover:bg-surface-2",
          "active:bg-bg-sunk",
          "focus-visible:border-accent",
          "disabled:border-dashed disabled:border-line disabled:text-ink-mute",
        ),
        destructive: cn(
          "rounded-pill bg-accent-soft text-accent-deep",
          "hover:bg-accent hover:text-accent-ink",
          "active:bg-accent-deep active:text-accent-ink",
          "focus-visible:bg-accent focus-visible:text-accent-ink",
          "disabled:bg-surface-2 disabled:text-ink-mute",
        ),
        icon: cn(
          // Icon-only — secondary state matrix per handoff §5.
          "rounded-full border border-line-strong bg-transparent text-ink",
          "tracking-normal normal-case font-normal",
          "hover:border-ink-3 hover:bg-surface-2",
          "active:bg-bg-sunk",
          "focus-visible:border-accent",
          "disabled:border-dashed disabled:border-line disabled:text-ink-mute",
        ),
      },
      size: {
        sm: "h-8 px-3.5 text-[12px]",
        md: "h-10 px-5 text-[13px]",
        lg: "h-12 px-8 text-[14px]",
      },
    },
    compoundVariants: [
      // Icon variant overrides padding + sets a fixed square footprint.
      { variant: "icon", size: "sm", class: "h-8 w-8 px-0" },
      { variant: "icon", size: "md", class: "h-10 w-10 px-0" },
      { variant: "icon", size: "lg", class: "h-12 w-12 px-0" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
