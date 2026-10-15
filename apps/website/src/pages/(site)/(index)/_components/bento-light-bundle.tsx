import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";

const ENHANCEMENTS = [
  {
    class: "col-span-2 row-span-2",
    description:
      "Wren tries to keep features minimal and focused on essentials, but flexible enough to let you build what you need.",
    icon: "i-lucide:feather",
    title: "Minimal API",
  },
  {
    class: "col-span-2",
    description:
      "Ship HTML without a client runtime by default. Use vanilla JS scripts without importing a framework.",
    icon: "i-lucide:circle-off",
    title: "Zero JS",
  },
  {
    class: "col-span-2",
    description: "Add lightweight behavior with standard script tags. Create web components.",
    icon: "i-lucide:file-code-2",
    title: "Vanilla JS scripts",
  },
  {
    class: "col-span-2 lg:row-span-2",
    description: "Our packages make an effort to use the least amount of dependencies possible.",
    icon: "i-lucide:package-minus",
    title: "Minimal Dependencies",
  },
  {
    class: "col-span-2 lg:col-span-2 row-span-2 lg:row-span-1",
    description: "Navigate without full page reloads when you need it.",
    icon: "i-lucide:route",
    title: "Client routing",
  },
  {
    class: "col-span-2 lg:col-span-2 row-span-2 lg:row-span-1",
    description: "Tune revalidation for each route (planned!).",
    icon: "i-lucide:refresh-cw",
    title: "Custom ISR",
  },
];

export function BentoLightBundle() {
  return (
    <div class=":uno: flex min-w-0 flex-1 flex-col gap-2">
      <h3 class=":uno: text-4 font-semibold">Thoughtful Enhancements</h3>
      <div class=":uno: grid min-w-0 flex-1 grid-cols-4 gap-4 text-gray-700">
        {ENHANCEMENTS.map((enhancement) => (
          <Tile {...enhancement} />
        ))}
      </div>
    </div>
  );
}

function Tile({ class: className, description, icon, title }: (typeof ENHANCEMENTS)[number]) {
  return (
    <Glass class={`${className} :uno: rounded-4 flex flex-col justify-center gap-1 p-4`}>
      <h3 class=":uno: flex items-center gap-2 font-semibold text-sm">
        <Icon class=":uno: size-6 shrink-0" name={icon} />
        {title}
      </h3>
      <p class=":uno: text-sm text-gray-600">{description}</p>
    </Glass>
  );
}
