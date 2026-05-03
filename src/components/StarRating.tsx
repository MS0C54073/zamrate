import { forwardRef } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

export const StarRating = forwardRef<HTMLDivElement, Props>(function StarRating(
  { value, onChange, size = 20, readOnly = false, className },
  ref,
) {
  return (
    <div ref={ref} className={cn("inline-flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={cn(
              "transition-transform",
              !readOnly && "hover:scale-110 cursor-pointer",
              readOnly && "cursor-default"
            )}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              size={size}
              className={cn(
                filled ? "fill-accent stroke-accent" : "stroke-muted-foreground/40 fill-transparent"
              )}
            />
          </button>
        );
      })}
    </div>
  );
});
