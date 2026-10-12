import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";

const latencyData = [
  {
    app: (
      <span class=":uno: inline-flex items-center gap-1">
        <Icon class=":uno: size-6" name="i-lucide:server" />
        Wren (SSX)
      </span>
    ),
    latency: 5,
  },

  {
    app: (
      <span class=":uno: inline-flex items-center gap-1">
        <Icon class=":uno: size-6" name="i-simple-icons:preact" />
        Wren (Preact)
      </span>
    ),
    latency: 5,
  },
  {
    app: (
      <span class=":uno: inline-flex items-center gap-1">
        <Icon class=":uno: size-6" name="i-simple-icons:react" /> Wren (React)
      </span>
    ),
    latency: 8,
  },
  {
    app: (
      <span class=":uno: inline-flex items-center gap-1">
        <Icon class=":uno: size-6" name="i-simple-icons:svelte" /> SvelteKit
      </span>
    ),
    latency: 17,
  },

  {
    app: (
      <span class=":uno: inline-flex items-center gap-1">
        <Icon class=":uno: size-6" name="i-simple-icons:astro" /> Astro
      </span>
    ),
    latency: 25,
  },
  {
    app: (
      <span class=":uno: inline-flex items-center gap-1">
        <Icon class=":uno: size-6" name="i-simple-icons:nextdotjs" /> NextJS
      </span>
    ),
    latency: 148,
  },
];

export function BentoLightSSR() {
  const maxLatency = Math.max(...latencyData.map((d) => d.latency));

  return (
    <div class=":uno: flex flex-col gap-2">
      <h3 class=":uno: text-4 font-semibold">Competitive Performance</h3>
      <Glass class=":uno: rounded-4 flex flex-col justify-center gap-4 p-4 text-gray-800">
        <div>
          <h4 class=":uno: text-base leading-none font-medium text-gray-800">
            Routing to Catch-all <span class=":uno: font-mono">/a/b/c</span>
          </h4>
          <p class=":uno: mt-1 text-sm text-gray-700">p50 response latency</p>
        </div>
        {latencyData.map(({ app, latency }) => (
          <div class=":uno: flex flex-col gap-1" key={app}>
            <div class=":uno: flex items-center justify-between text-sm">
              <span class=":uno: font-medium text-gray-700">{app}</span>
              <span class=":uno: text-gray-600 tabular-nums">~{latency.toFixed(2)} ms</span>
            </div>
            <div class=":uno: h-2 w-full overflow-hidden rounded-full bg-white/75">
              <div
                class=":uno: from-blue/50 via-pink/50 to-purple/50 h-full rounded-full bg-gradient-to-r transition-[width] duration-700"
                style={{
                  width: `${Math.max((latency / maxLatency) * 100, 2)}%`,
                }}
              />
            </div>
          </div>
        ))}
        <p class=":uno: text-3 text-gray-600 max-w-[50ch]">
          <span class="block">
            node v26.10.0, autocannon v8.0.0, 50 connections, 10 pipelining, 15s duration, M4 Pro.
            Routes attempted to not include any client assets
          </span>
          <span class="inline-flex items-center gap-1 text-3 text-gray-500 mt-1">
            <Icon name="i-lucide:circle-alert" /> Take these results with a grain of salt!
          </span>
        </p>
      </Glass>
    </div>
  );
}
