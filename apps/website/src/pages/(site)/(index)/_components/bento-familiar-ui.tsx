import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import { cn } from "#/utils/cn";
import styles from "./bento.module.css";

export function BentoFamiliarUI() {
  return (
    <div class=":uno: flex flex-col gap-2">
      <h3 class=":uno: text-4 font-semibold">UI</h3>
      <div class={styles.bento}>
        <Glass class={styles.tile}>
          <a
            class="grid place-items-center size-full"
            href="https://react.dev"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon alt="React" class=":uno: size-3/5" name="i-simple-icons:react" />
          </a>
        </Glass>

        <Glass class={styles.tile}>
          <a
            class="grid place-items-center size-full"
            href="https://preactjs.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon alt="Preact" class=":uno: size-3/5" name="i-simple-icons:preact" />
          </a>
        </Glass>

        <Glass class={cn(styles.tile, ":uno: font-mono text-5")}>
          <a
            class="grid place-items-center size-full"
            href="https://github.com/oscarotero/ssx"
            rel="noopener noreferrer"
            target="_blank"
            title="SSX"
          >
            SSX
          </a>
        </Glass>

        <Glass class={styles.tile}>
          <span class="text-center text-3 m-1 select-none">More to come!</span>
        </Glass>
      </div>
    </div>
  );
}
