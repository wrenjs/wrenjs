import { cn } from "#/utils/cn";
export type IconProps = JSX.IntrinsicElements["div"] & {
  alt?: string;
  name: string;
  size?: number | number[] | string | string[];
};
export function Icon({ alt, class: className, name, role = "img", size, ...rest }: IconProps) {
  const [width, height] = Array.isArray(size) ? size : [size ?? undefined, size ?? undefined];

  return (
    <i
      aria-hidden={alt ? undefined : "true"}
      aria-label={alt}
      class={cn(" inline-block ", name, className ?? undefined)}
      inert={alt ? undefined : "true"}
      role={alt ? role : undefined}
      style={{ height: String(height), width: String(width) }}
      title={alt}
      {...rest}
    />
  );
}
