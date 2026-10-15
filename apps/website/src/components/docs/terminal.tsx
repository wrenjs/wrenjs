"use client";

import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { LS_PKG_KEY, PACKAGE_MANAGERS } from "#/constants";
import { cn } from "#/utils/cn";
import { Glass } from "../glass";
import { Icon } from "../icon";

const DEFAULT_MANAGER = PACKAGE_MANAGERS[0];

interface TerminalProps {
  class?: string;
  contents: string | string[];
  icon?: string;
  kind?: "file" | "shell";
  path?: string;
}
export function Terminal({
  class: className,
  contents,
  icon,
  kind = "shell",
  path,
}: TerminalProps) {
  const packageManager = useSignal(DEFAULT_MANAGER);
  const copied = useSignal(false);
  const parsedContents = Array.isArray(contents) ? contents.join("\n") : contents;

  useEffect(() => {
    const storedManager =
      document.documentElement.dataset[LS_PKG_KEY] || window.localStorage.getItem(LS_PKG_KEY);
    if (storedManager && PACKAGE_MANAGERS.includes(storedManager)) {
      packageManager.value = storedManager;
    }
  }, [packageManager]);

  function selectPackageManager(item: string) {
    document.documentElement.dataset[LS_PKG_KEY] = item;
    window?.localStorage?.setItem(LS_PKG_KEY, item);
    packageManager.value = item;
  }

  return (
    <Glass class={cn(":uno: block relative rounded-xl terminal", className)}>
      {kind === "file" && (
        <div class="relative flex gap-2 items-center w-full border-b border-black/10 px-2 py-3 text-gray-800 pl-4 font-semibold">
          {icon && <Icon class=":uno: size-4 " name={icon} />}
          {path && <span>{path}</span>}
        </div>
      )}
      {kind === "shell" && (
        <div class="relative flex items-center w-full justify-between border-b border-black/10 px-2">
          <div aria-label="Package manager" class="flex" role="tablist">
            {PACKAGE_MANAGERS.map((item) => (
              <button
                aria-selected={packageManager.value === item}
                class={`:uno: cursor-pointer border-b-4 border-transparent px-3 py-2 font-mono text-sm text-gray-800 transition-colors hover:text-gray-900 [html[data-${LS_PKG_KEY.replaceAll(":", "\\:")}=${item}]_&]:border-b-blue`}
                data-pm-tab={item}
                key={item}
                onClick={() => selectPackageManager(item)}
                role="tab"
                tabIndex={packageManager.value === item ? 0 : -1}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
      {kind === "shell" && (
        <div aria-live="polite" role="tabpanel">
          {PACKAGE_MANAGERS.map((item) => (
            <pre
              class={`m-0 overflow-x-auto p-4 font-mono text-sm leading-6 hidden [html[data-${LS_PKG_KEY.replaceAll(":", "\\:")}=${item}]_&]:block`}
              data-active={packageManager.value === item}
              data-pm-command={item}
              key={item}
            >
              <code>{parsedContents.replaceAll(LS_PKG_KEY, item)}</code>
            </pre>
          ))}
        </div>
      )}

      {kind === "file" && (
        <div>
          <pre class="m-0 overflow-x-auto p-4 font-mono text-sm leading-6">{parsedContents}</pre>
        </div>
      )}

      <div class=":uno: flex gap-4">
        <button
          aria-label={copied.value ? "Copied" : "Copy command"}
          class=":uno: grid size-8 place-items-center rounded-md border border-gray-200 text-gray-800 transition-colors hover:text-black m-1 absolute right-0 top-0"
          onClick={() => void copyCommand(parsedContents, packageManager.value, copied)}
          title={copied.value ? "Copied" : "Copy command"}
          type="button"
        >
          <Icon class="size-4" name={copied.value ? "i-lucide:check" : "i-lucide:copy"} />
        </button>
      </div>
    </Glass>
  );
}

async function copyCommand(contents: string, packageManager: string, copied: any) {
  try {
    await navigator.clipboard.writeText(contents.replaceAll(LS_PKG_KEY, packageManager));
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy: ", err);
  }
}
