import autocannon, { type Result } from "autocannon";
import { execSync, spawn, spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { COLD_SAMPLES, PATHS, RUNNERS } from "./config.ts";

const DURATION = 30;
const WARMUP = 5;
const CONNECTIONS = 50;
const PIPELINING = 10;
const COLD = process.argv.includes("--cold");

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

const startServer = (runner: (typeof RUNNERS)[number], port: number) => {
  const [command, ...args] = runner.serve.split(" ");
  const direct = command === "node";
  const server = spawn(direct ? process.execPath : runner.serve, direct ? args : [], {
    cwd: new URL(runner.cwd, import.meta.url),
    detached: !direct,
    env: { ...process.env, PORT: String(port) },
    shell: !direct,
    stdio: ["ignore", "ignore", "ignore"],
  });
  return () => {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    if (direct || !server.pid) server.kill("SIGTERM");
    else process.kill(-server.pid, "SIGTERM");
    return exited;
  };
};

const percentile = (values: number[], p: number) =>
  values.toSorted((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))];
const round = (value: number) => Math.round(value * 100) / 100;

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

const runThroughput = async () => {
  const results = [];
  for (const runner of RUNNERS) {
    STARTING_PORT++;

    heading("◆", runner.name);
    const stopServer = startServer(runner, STARTING_PORT);

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
      await stopServer();
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
};

const firstResponse = async (url: string) => {
  for (;;) {
    const response = await fetch(url).catch(() => undefined);
    if (response) return response.arrayBuffer();
    await sleep(1);
  }
};

const coldSample = async (runner: (typeof RUNNERS)[number], path: string) => {
  STARTING_PORT++;
  const start = performance.now();
  const stopServer = startServer(runner, STARTING_PORT);
  try {
    await firstResponse(`http://localhost:${STARTING_PORT}${path}`);
    return performance.now() - start;
  } finally {
    await stopServer();
  }
};

const runColdStart = async () => {
  const baseline: number[] = [];
  for (let i = 0; i < COLD_SAMPLES; i++) {
    const start = performance.now();
    spawnSync(process.execPath, ["-e", "0"]);
    baseline.push(performance.now() - start);
  }
  const floor = percentile(baseline, 0.5);
  console.debug(`\n  ${dim("○")} ${dim("node -e 0 baseline")} ${bold(`${round(floor)} ms`)}`);

  const results = [];
  for (const runner of RUNNERS) {
    heading("◆", runner.name);
    for (const path of PATHS) {
      process.stdout.write(`    ${dim(`Sampling ${path}`.padEnd(20))}`);
      const samples: number[] = [];
      for (let i = 0; i < COLD_SAMPLES; i++) samples.push(await coldSample(runner, path));
      const p50 = percentile(samples, 0.5);
      const p90 = percentile(samples, 0.9);
      console.debug(
        `${green("✓")}  ${bold(`${round(p50)} ms`)} ${dim("p50")}     ${bold(`${round(p90)} ms`)} ${dim("p90")}`,
      );
      results.push({
        App: runner.name,
        "Over node (ms)": round(p50 - floor),
        "P50 (ms)": round(p50),
        "P90 (ms)": round(p90),
        Path: path,
      });
    }
  }

  heading("◆", "Cold start · spawn → first response complete");
  for (const path of PATHS) {
    console.debug(`\n${bold(path)} ${dim("· ranked by p50")}`);
    console.table(
      results
        .filter((result) => result.Path === path)
        .toSorted((left, right) => left["P50 (ms)"] - right["P50 (ms)"]),
    );
  }
};

await (COLD ? runColdStart() : runThroughput());
