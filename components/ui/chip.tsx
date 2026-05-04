import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------------------
   Chip — handoff §6
   - Pill shape, condensed uppercase label, hairline border by default.
   - `size="sm"` is the dense filter-row size; `md` matches the handoff default
     (10×16 padding).
   - `selected` flips to the accent-soft + accent border treatment.
   - Renders as <span> by default; pass `as="button"` for interactive filters.
   ----------------------------------------------------------------------------- */

const chipVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill",
    "font-condensed font-bold uppercase tracking-[0.06em]",
    "border transition-[background-color,border-color,color] duration-150 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft focus-visible:border-accent",
    "disabled:cursor-not-allowed disabled:opacity-55",
  ),
  {
    variants: {
      variant: {
        neutral: cn(
          "bg-surface-2 text-ink border-line",
          "hover:bg-bg-elev hover:border-line-strong",
          "data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-deep data-[selected=true]:border-accent",
        ),
        accent: cn(
          "bg-accent-soft text-accent-deep border-accent-soft",
          "hover:border-accent",
        ),
        gold: cn(
          "bg-gold/20 text-ink border-gold/40",
          "hover:border-gold",
        ),
        success: cn(
          "bg-success/15 text-success border-success/30",
          "hover:border-success",
        ),
        warning: cn(
          "bg-warning/20 text-ink border-warning/40",
          "hover:border-warning",
        ),
        danger: cn(
          "bg-accent-soft text-accent-deep border-accent/30",
          "hover:border-accent",
        ),
      },
      size: {
        sm: "h-7 px-3 text-[11px]",
        md: "h-9 px-4 text-[13px]",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

type ChipBaseProps = VariantProps<typeof chipVariants> & {
  selected?: boolean;
  className?: string;
  children: React.ReactNode;
};

type ChipPolymorphicProps<E extends React.ElementType> = ChipBaseProps & {
  as?: E;
} & Omit<React.ComponentPropsWithoutRef<E>, keyof ChipBaseProps | "as">;

export function Chip<E extends React.ElementType = "span">({
  as,
  variant,
  size,
  selected,
  className,
  children,
  ...rest
}: ChipPolymorphicProps<E>) {
  const Component = (as ?? "span") as React.ElementType;
  return (
    <Component
      data-selected={selected ? "true" : undefined}
      className={cn(chipVariants({ variant, size }), className)}
      {...rest}
    >
      {children}
    </Component>
  );
}

export { chipVariants };
