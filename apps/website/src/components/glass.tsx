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
            ":uno: bg-white border-t-gray/20 border-l-black/10 border border-b-gray/30 border-r-gray/40 ring-1 ring-white/90 backdrop-blur-sm backdrop-brightness-150",
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
