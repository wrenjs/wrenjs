import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";

const FEATURES = [
  {
    class: "col-span-1 lg:col-span-2",
    description: "Use the file system to define routes, layouts, and more.",
    icon: "i-lucide:folder-tree",
    title: "File-based routing",
  },
  {
    class: "col-span-1 lg:col-span-2 lg:row-start-2",
    description: "Use a config file for more control and flexibility.",
    icon: "i-lucide:settings-2",
    title: "Config-based routing",
  },
  {
    class: "col-span-1 row-span-2 lg:row-span-1",
    description: "Define middleware at the route, layout, or app level and compose them together.",
    icon: "i-lucide:layers",
    title: "Layered Middleware",
  },
  {
    class: "col-span-1 row-span-2 lg:row-span-1",
    description: "Define data loaders at the route, layout, or app level, and share the results.",
    icon: "i-lucide:database",
    title: "Layered Loaders",
  },
  {
    class: "col-span-2",
    description:
      "Continue using file or function-level directives for client-server boundaries (in applicable frameworks)",
    icon: "i-simple-icons:react",
    title: '"use" directives',
  },
  {
    class: "col-span-1",
    description: "Continue using familiar Vite plugins.",
    icon: "i-lucide:plug",
    title: "vite plugins",
  },
  {
    class:
      "col-span-1 row-span-2 row-start-3 aspect-[5/3] lg:row-span-1 lg:row-start-auto lg:aspect-initial",
    description: "Choose between React or Preact (more to come).",
    icon: "i-lucide:blocks",
    title: "UI Frameworks",
  },
  {
    class:
      "col-span-1 lg:col-start-1 row-span-1 aspect-[5/3] lg:aspect-initial lg:col-span-2 lg:col-start-initial",
    description: "Static site generation for pre-rendered content.",
    icon: "i-lucide:image",
    title: "SSG",
  },
  {
    class: "col-span-1 lg:col-start-1 lg:row-span-1 row-span-1 lg:col-span-2 lg:col-start-initial",
    description: "Server-side rendering for dynamic content.",
    icon: "i-lucide:server",
    title: "SSR",
  },
  {
    class: "col-span-1 row-span-2 lg:row-span-1 lg:col-span-1",
    description: (
      <span>
        <em>Optionally</em> navigate between pages on the client side without full page reloads.
      </span>
    ),
    icon: "i-lucide:compass",
    title: "Client-side Routing",
  },

  {
    class: "col-span-1 lg:col-start-4 lg:row-start-4",
    description:
      "Create dynamic components with a script tag and JSX, without bundling frameworks.",
    icon: "i-lucide:code",
    title: "Vanilla-JS component script",
  },
  {
    class: "col-span-1",
    description: "Check our documentation for more features.",
    href: "/docs",
    icon: "i-lucide:external-link",
    title: "And more",
  },
];

export function BentoFamiliarFeatures() {
  return (
    <div class=":uno: flex flex-1 flex-col gap-2">
      <h3 class=":uno: text-4 font-semibold">Features</h3>
      <div class=":uno: grid min-w-0 flex-1 grid-flow-dense grid-rows-[repeat(auto-fill,minmax(min-content,max-content))] grid-cols-2 gap-3 text-gray-700 lg:grid-cols-4 lg:grid-rows-none">
        {FEATURES.map((feature) => (
          <FeatureTile {...feature} />
        ))}
      </div>
    </div>
  );
}

function FeatureTile({
  class: className,
  description,
  href,
  icon,
  title,
}: (typeof FEATURES)[number]) {
  const Tag = href ? "a" : "div";
  return (
    <Tag class={`${className} min-w-0 rounded-4`} href={href}>
      <Glass class=":uno: rounded-4 flex min-w-0 flex-col justify-center gap-1 p-3 size-full sm:p-4">
        <h3 class=":uno: flex min-w-0 items-center gap-2 text-sm font-semibold leading-snug">
          <Icon class=":uno: size-5 shrink-0 sm:size-6" name={icon} />
          <span class=":uno: min-w-0 break-words">{title}</span>
        </h3>
        <p class=":uno: text-xs leading-snug text-gray-600 sm:text-sm">{description}</p>
      </Glass>
    </Tag>
  );
}
