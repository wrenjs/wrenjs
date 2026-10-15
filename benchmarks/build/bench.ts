import { spawn } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";
import { availableParallelism, cpus } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { APP, type Runner, RUNNERS, SAMPLES, WARMUPS } from "./config.ts";
import { countPages, generate, MARKER } from "./generate.ts";

interface Stats {
  max: number;
  median: number;
  min: number;
}

const PAGES = countPages(APP);
const ENV = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", NEXT_TELEMETRY_DISABLED: "1" };

const supportsColor = !process.env.NO_COLOR;
const paint = (code: number, value: string) =>
  supportsColor ? `\x1b[${code}m${value}\x1b[0m` : value;
const bold = (value: string) => paint(1, value);
const dim = (value: string) => paint(2, value);
const green = (value: string) => paint(32, value);
const cyan = (value: string) => paint(36, value);

const heading = (icon: string, title: string) =>
  console.debug(`\n${cyan(bold(`${icon} ${title}`))}`);

const directory = (runner: Runner) =>
  fileURLToPath(new URL(`./${runner.framework}/`, import.meta.url));

const exec = (command: string, cwd: string) =>
  new Promise<number>((resolve, reject) => {
    const output: Buffer[] = [];
    const start = performance.now();
    const child = spawn(command, { cwd, env: ENV, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => output.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      const elapsed = performance.now() - start;
      if (code === 0) resolve(elapsed);
      else reject(new Error(`"${command}" failed in ${cwd}\n\n${Buffer.concat(output)}`));
    });
  });

const build = async (runner: Runner, cwd: string) => {
  await Promise.all(
    runner.clean.map((path) => rm(join(cwd, path), { force: true, recursive: true })),
  );
  return exec(runner.build, cwd);
};

const countPrerendered = async (path: string) => {
  const entries = await readdir(path, { recursive: true, withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  const pages = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
      .map(async (entry) =>
        (await readFile(join(entry.parentPath, entry.name), "utf8")).includes(MARKER),
      ),
  );
  return pages.filter(Boolean).length;
};

const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const seconds = (ms: number) => Math.round(ms / 10) / 100;
const format = (ms: number) => bold(`${(ms / 1000).toFixed(2)} s`);

const measure = async (runner: Runner, prerender: boolean): Promise<Stats> => {
  const cwd = directory(runner);
  const label = prerender ? "With prerendering" : "Without prerendering";
  process.stdout.write(`  ${dim("○")} ${label.padEnd(22)}`);
  await generate(runner.framework, cwd, APP, prerender);
  for (let i = 0; i < WARMUPS; i++) await build(runner, cwd);
  const samples: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    samples.push(await build(runner, cwd));
    process.stdout.write(dim("·"));
  }
  const expected = prerender ? PAGES : 0;
  const prerendered = await countPrerendered(join(cwd, runner.prerendered));
  if (prerendered !== expected) {
    throw new Error(`${runner.name} prerendered ${prerendered} pages, expected ${expected}.`);
  }
  const stats = { max: Math.max(...samples), median: median(samples), min: Math.min(...samples) };
  console.debug(
    ` ${green("✓")}  ${format(stats.median)} ${dim("median")}     ${format(stats.min)} ${dim("min")}     ${format(stats.max)} ${dim("max")}`,
  );
  return stats;
};

const row = (name: string, { max, median, min }: Stats) => ({
  App: name,
  "Median (s)": seconds(median),
  "Min (s)": seconds(min),
  "Max (s)": seconds(max),
});

console.debug(bold("▲ Build benchmark"));
console.debug(
  dim(
    `  ${PAGES} pages (${APP.sections * APP.pagesPerSection} static routes, ${APP.posts} dynamic) · ${APP.components} components · ${SAMPLES} cold builds + ${WARMUPS} warmup per mode`,
  ),
);
console.debug(
  dim(
    `  node ${process.version} · ${process.platform} ${process.arch} · ${cpus()[0]?.model} × ${availableParallelism()}`,
  ),
);

heading("◆", "Installing");
for (const runner of RUNNERS) {
  process.stdout.write(`  ${dim("○")} ${runner.name.padEnd(22)}`);
  await exec(runner.install, directory(runner));
  console.debug(green("✓"));
}

const results = [];
for (const runner of RUNNERS) {
  heading("◆", runner.name);
  const server = await measure(runner, false);
  const prerender = await measure(runner, true);
  results.push({ name: runner.name, prerender, server });
}

heading("◆", `Results · median of ${SAMPLES} cold builds`);

console.debug(`\n${bold("Without prerendering")} ${dim("· ranked by median build time")}`);
console.table(
  results
    .toSorted((left, right) => left.server.median - right.server.median)
    .map(({ name, server }) => row(name, server)),
);

console.debug(
  `\n${bold(`With prerendering · ${PAGES} pages`)} ${dim("· ranked by median build time")}`,
);
console.table(
  results
    .toSorted((left, right) => left.prerender.median - right.prerender.median)
    .map(({ name, prerender, server }) => ({
      ...row(name, prerender),
      "Prerender cost (s)": seconds(prerender.median - server.median),
    })),
);
