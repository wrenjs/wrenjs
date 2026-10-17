import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";

const GROUPS = [
  {
    label: "Hosts",
    links: [
      {
        href: "https://www.cloudflare.com/",
        icon: "i-simple-icons:cloudflare",
        label: "Cloudflare",
      },
      { href: "https://vercel.com/", icon: "i-simple-icons:vercel", label: "Vercel" },
      { href: "https://www.netlify.com/", icon: "i-simple-icons:netlify", label: "Netlify" },
    ],
    more: [
      { href: "https://nodejs.org/", icon: "i-simple-icons:nodedotjs", label: "Node.js" },
      { href: "https://deno.land/", icon: "i-simple-icons:deno", label: "Deno" },
      { href: "https://bun.sh/", icon: "i-simple-icons:bun", label: "Bun" },
      { href: "https://www.docker.com/", icon: "i-simple-icons:docker", label: "Docker" },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "https://vitejs.dev/", icon: "i-simple-icons:vite", label: "Vite" },
      {
        href: "https://tailwindcss.com/",
        icon: "i-simple-icons:tailwindcss",
        label: "Tailwind CSS",
      },
      { href: "https://eslint.org/", icon: "i-simple-icons:eslint", label: "ESLint" },
    ],
    more: [
      { href: "https://unocss.dev/", icon: "i-simple-icons:unocss", label: "UnoCSS" },
      { href: "https://oxc.dev/", icon: "i-simple-icons:oxc", label: "OXC" },
      {
        href: "https://better-auth.com/",
        icon: "i-wren:better-auth-mark-dark",
        label: "Better Auth",
      },
      { href: "https://motion.dev/", icon: "i-wren:motion", label: "Motion" },
    ],
  },
];

export function BentoFamiliarLinks() {
  return GROUPS.map(({ label, links, more }) => (
    <div class=":uno: flex flex-col gap-2" key={label}>
      <h3 class=":uno: text-4 font-semibold">{label}</h3>
      <div class=":uno: bento-grid">
        {links.map((link) => (
          <Glass class=":uno: bento-tile" key={link.href}>
            <TileLink {...link} />
          </Glass>
        ))}
        <Glass class=":uno: relative grid grid-cols-2 grid-rows-2 items-stretch justify-items-stretch gap-2 rounded-[calc(var(--tile)/5)] p-3.5 pb-2">
          {more.map((link) => (
            <div class=":uno: relative flex items-center justify-center" key={link.href}>
              <TileLink {...link} small />
            </div>
          ))}
        </Glass>
      </div>
    </div>
  ));
}

function TileLink({
  href,
  icon,
  label,
  small = false,
}: {
  href: string;
  icon: string;
  label: string;
  small?: boolean;
}) {
  return (
    <a
      class=":uno: absolute inset-0 grid size-full place-items-center"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon alt={label} class={small ? ":uno: size-7/8" : ":uno: size-3/5"} name={icon} />
    </a>
  );
}
