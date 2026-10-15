import { cn } from "#/utils/cn";
import styles from "./glass.module.css";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "wren-glass": IntrinsicElements["div"];
    }
  }
}

export interface GlassProps {
  children: JSX.Children;
  class?: string;
  id?: string;
  interactive?: boolean;
  style?: Record<string, string>;
  tint?: string;
  variant?: "background" | "primary";
}

const TINT_MAP = new Map<GlassProps["tint"], string>([
  ["gray", "hsl(0, 0%, 50%)"],
  ["green", "hsl(120, 100%, 50%)"],
  ["red", "hsl(0, 100%, 50%)"],
]);

export function Glass({
  children,
  class: className,
  style,
  tint,
  variant = "primary",
  ...props
}: GlassProps & Omit<JSX.IntrinsicElements["div"], keyof GlassProps>) {
  const tintValue = TINT_MAP.get(tint ?? "") ?? tint;
  return (
    <>
      <wren-glass
        class={cn(
          styles.glass,
          variant === "primary" &&
            ":uno: bg-white bg-gradient-to-br from-white/30 via-white/10 to-black/3 border border-t-white/60 border-l-white/40 border-b-gray/20 border-r-gray/25 ring-1 ring-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.08)]",
          className,
        )}
        style={{ "--glass-tint": tintValue, ...style }}
        {...props}
      >
        {children}
      </wren-glass>
      <script src="./glass.script.ts" type="module" />
    </>
  );
}
