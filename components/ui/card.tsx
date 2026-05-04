import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* -----------------------------------------------------------------------------
   Card — handoff §6
   - Base: surface bg, hairline border, md radius, shadow-1, padding 16.
   - `padding="compact"` → 14, `padding="hero"` → 20, `padding="none"` → 0.
   - `interactive` adds hover lift (shadow-2 + translateY(-2px)) and a focus
     ring. Border color stays put on hover per spec.
   ----------------------------------------------------------------------------- */
const cardVariants = cva(
  cn(
    "flex flex-col gap-2 bg-surface-1 border border-line rounded-md shadow-1",
    "transition-[box-shadow,transform,border-color] duration-200 ease-out",
  ),
  {
    variants: {
      padding: {
        none: "p-0",
        compact: "p-3.5",
        default: "p-4",
        hero: "p-5",
      },
      interactive: {
        true: cn(
          "cursor-pointer",
          "hover:-translate-y-0.5 hover:shadow-2",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft focus-visible:border-accent",
        ),
        false: "",
      },
    },
    defaultVariants: { padding: "default", interactive: false },
  },
);

type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
} & VariantProps<typeof cardVariants> &
  Omit<React.ComponentPropsWithoutRef<E>, "as" | keyof VariantProps<typeof cardVariants>>;

export function Card<E extends React.ElementType = "div">({
  as,
  padding,
  interactive,
  className,
  ...props
}: PolymorphicProps<E>) {
  const Component = (as ?? "div") as React.ElementType;
  return (
    <Component className={cn(cardVariants({ padding, interactive }), className)} {...props} />
  );
}

export { cardVariants };
