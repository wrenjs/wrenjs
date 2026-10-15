import Link from "@wren-js/core/link";
import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import styles from "./bento.module.css";

export function BentoFamiliarTools() {
  return (
    <div class=":uno: flex flex-col gap-2">
      <h3 class=":uno: text-4 font-semibold">Tools</h3>
      <div class={styles.bento}>
        <Glass class={styles.tile}>
          <Link
            class="absolute size-full inset-0 grid place-items-center"
            href="https://vitejs.dev/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon alt="Vite" class=":uno: size-3/5" name="i-simple-icons:vite" />
          </Link>
        </Glass>

        <Glass class={styles.tile}>
          <Link
            class="absolute size-full inset-0 grid place-items-center"
            href="https://tailwindcss.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon alt="Tailwind CSS" class=":uno: size-3/5" name="i-simple-icons:tailwindcss" />
          </Link>
        </Glass>

        <Glass class={styles.tile}>
          <Link
            class="absolute size-full inset-0 grid place-items-center"
            href="https://eslint.org/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon alt="ESLint" class=":uno: size-3/5" name="i-simple-icons:eslint" />
          </Link>
        </Glass>

        <Glass class={`${styles.tile} ${styles.tileFolder}`}>
          <div class={styles.mini}>
            <Link
              class="absolute size-full inset-0 grid place-items-center"
              href="https://unocss.dev/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon alt="UnoCSS" class=":uno: size-7/8" name="i-simple-icons:unocss" />
            </Link>
          </div>
          <div class={styles.mini}>
            <Link
              class="absolute size-full inset-0 grid place-items-center"
              href="https://oxc.dev/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon alt="OXC" class=":uno: size-7/8" name="i-simple-icons:oxc" />
            </Link>
          </div>
          <div class={styles.mini}>
            <Link
              class="absolute size-full inset-0 grid place-items-center"
              href="https://better-auth.com/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon alt="Better Auth" class=":uno: size-7/8" name="i-wren:better-auth-mark-dark" />
            </Link>
          </div>
          <div class={styles.mini}>
            <Link
              class="absolute size-full inset-0 grid place-items-center"
              href="https://motion.dev/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon alt="Motion" class=":uno: size-7/8" name="i-wren:motion" />
            </Link>
          </div>
        </Glass>
      </div>
    </div>
  );
}
