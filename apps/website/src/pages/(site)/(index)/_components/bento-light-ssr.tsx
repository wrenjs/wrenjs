import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";

const latencyData = [
  { app: "Wren (Preact)", icon: "i-simple-icons:preact", latency: 3 },
  { app: "Wren (SSX)", icon: "i-lucide:server", latency: 4 },
  { app: "Wren (React)", icon: "i-simple-icons:react", latency: 8 },
  { app: "SvelteKit", icon: "i-simple-icons:svelte", latency: 17 },
  { app: "Astro", icon: "i-simple-icons:astro", latency: 25 },
  { app: "NextJS", icon: "i-simple-icons:nextdotjs", latency: 148 },
];

const maxLatency = Math.max(...latencyData.map(({ latency }) => latency));

export function BentoLightSSR() {
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
        {latencyData.map(({ app, icon, latency }) => (
          <div class=":uno: flex flex-col gap-1" key={app}>
            <div class=":uno: flex items-center justify-between text-sm">
              <span class=":uno: inline-flex items-center gap-1 font-medium text-gray-700">
                <Icon class=":uno: size-6" name={icon} />
                {app}
              </span>
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
