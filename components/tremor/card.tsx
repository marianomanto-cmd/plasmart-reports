// Tremor Card [v1.0.0]
// Fuente: tremorlabs/tremor — src/components/Card/Card.tsx (copy-paste textual).
// Sin modificaciones. Las únicas diferencias respecto al upstream son:
//   - import de cx apunta a "@/lib/tremor/cx" en vez de "../../utils/cx".

import React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cx } from "@/lib/tremor/cx";

interface CardProps extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, asChild, ...props }, forwardedRef) => {
    const Component = asChild ? Slot : "div";
    return (
      <Component
        ref={forwardedRef}
        className={cx(
          // base (Reactor Neon glass)
          "relative w-full rounded-3xl border p-6 text-left",
          // glass surface + neon border + glow
          "bg-[var(--glass-bg)] backdrop-blur-xl backdrop-saturate-150",
          "border-[var(--glass-border)] shadow-[0_12px_34px_rgba(0,0,0,0.55),0_0_22px_rgba(43,255,174,0.07)]",
          className,
        )}
        tremor-id="tremor-raw"
        {...props}
      />
    );
  },
);

Card.displayName = "Card";

export { Card, type CardProps };
