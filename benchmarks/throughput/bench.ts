import autocannon, { type Result } from "autocannon";
import { execSync, spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { PATHS, RUNNERS } from "./config.ts";

const DURATION = 30;
const WARMUP = 5;
const CONNECTIONS = 50;
const PIPELINING = 10;

let STARTING_PORT = 30000;

const supportsColor = !process.env.NO_COLOR;
const paint = (code: number, value: string) =>
  supportsColor ? `\x1b[${code}m${value}\x1b[0m` : value;
const bold = (value: string) => paint(1, value);
const dim = (value: string) => paint(2, value);
const green = (value: string) => paint(32, value);
const cyan = (value: string) => paint(36, value);

const heading = (icon: string, title: string) =>
  console.debug(`\n${cyan(bold(`${icon} ${title}`))}`);

const run = (url: string, duration: number) =>
  new Promise<Result>((resolve, reject) =>
    autocannon(
      { connections: CONNECTIONS, duration, pipelining: PIPELINING, url },
      (error, result) => (error ? reject(error) : resolve(result)),
    ),
  );

const results = [];

for (const runner of RUNNERS) {
  const cwd = new URL(runner.cwd, import.meta.url);
  console.debug(bold(`▲ ${runner.name}`));
  for (const [label, command] of [
    ["Installing", runner.install],
    ["Building", runner.build],
  ]) {
    process.stdout.write(`  ${dim("○")} ${label.padEnd(12)}`);
    execSync(command, { cwd, stdio: ["ignore", "ignore", "ignore"] });
    console.debug(green("✓"));
  }
}

for (const runner of RUNNERS) {
  STARTING_PORT++;

  const cwd = new URL(runner.cwd, import.meta.url);
  heading("◆", runner.name);
  const server = spawn(runner.serve, {
    cwd,
    env: { ...process.env, PORT: String(STARTING_PORT) },
    shell: true,
    stdio: ["ignore", "ignore", "ignore"],
  });

  try {
    const origin = `http://localhost:${STARTING_PORT}`;
    process.stdout.write(`  ${dim("○")} Starting server `);
    while (!(await fetch(origin).catch(() => undefined))) await sleep(100);
    console.debug(green(`✓ ${origin}`));

    for (const path of PATHS) {
      const url = `${origin}${path}`;
      process.stdout.write(`    ${dim("Warming up".padEnd(16))}`);
      await run(url, WARMUP);
      console.debug(green("✓"));
      process.stdout.write(`    ${dim(`Running ${path}`.padEnd(16))}`);
      const result = await run(url, DURATION);
      console.debug(green("✓"));
      results.push({
        App: runner.name,
        "Latency (ms)": result.latency.mean,
        "P50 Latency (ms)": result.latency.p50,
        "P99 Latency (ms)": result.latency.p99,
        Path: path,
        "Req/s": result.requests.mean,
      });
      console.debug(
        `     ${green(bold(`${result.requests.mean} req/s`))} ${dim("avg")}     ${bold(`${result.latency.mean} ms`)} ${dim("avg")}     ${bold(`${result.latency.p50} ms`)} ${dim("p50")}     ${bold(`${result.latency.p99} ms`)} ${dim("p99")}`,
      );
    }
  } finally {
    server.kill("SIGTERM");
    console.debug(`\n  ${dim("◇ Server stopped")}`);
  }
}

heading("◆", "Results");
for (const path of PATHS) {
  console.debug(`\n${bold(path)} ${dim("· ranked by requests/sec")}`);
  console.table(
    results
      .filter((result) => result.Path === path)
      .toSorted((left, right) => right["Req/s"] - left["Req/s"]),
  );
}
