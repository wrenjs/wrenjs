import { Glass, type GlassProps } from "../glass";

interface BadgeProps extends GlassProps {
  size?: "md" | "sm";
}

const SIZE_MAP = new Map<BadgeProps["size"], string>([
  ["md", "px-3 py-1 text-sm font-semibold gap-1.5"],
  ["sm", "px-2.5 py-0.5 text-xs font-medium gap-1"],
]);

export function Badge({ children, size = "sm", ...props }: BadgeProps) {
  return (
    <Glass
      {...props}
      class={`font-sans inline-flex items-center rounded-full text-black ${SIZE_MAP.get(size) ?? ""}`}
    >
      {children}
    </Glass>
  );
}

export default Badge;
