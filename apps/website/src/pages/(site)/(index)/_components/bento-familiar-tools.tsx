import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import styles from "./bento.module.css";

export function BentoFamiliarTools() {
  return (
    <div class=":uno: flex flex-col gap-2">
      <h3 class=":uno: text-4 font-semibold">Tools</h3>
      <div class={styles.bento}>
        <Glass class={styles.tile}>
          <Icon alt="Vite" class=":uno: size-3/5" name="i-simple-icons:vite" />
        </Glass>

        <Glass class={styles.tile}>
          <Icon alt="Tailwind CSS" class=":uno: size-3/5" name="i-simple-icons:tailwindcss" />
        </Glass>

        <Glass class={styles.tile}>
          <Icon alt="ESLint" class=":uno: size-3/5" name="i-simple-icons:eslint" />
        </Glass>

        <Glass class={`${styles.tile} ${styles.tileFolder}`}>
          <div class={styles.mini}>
            <Icon alt="UnoCSS" class=":uno: size-7/8" name="i-simple-icons:unocss" />
          </div>
          <div class={styles.mini}>
            <Icon alt="OXC" class=":uno: size-7/8" name="i-simple-icons:oxc" />
          </div>
          <div class={styles.mini}>
            <Icon alt="Better Auth" class=":uno: size-7/8" name="i-wren:better-auth-mark-dark" />
          </div>
          <div class={styles.mini}>
            <Icon alt="Motion" class=":uno: size-7/8" name="i-wren:motion" />
          </div>
        </Glass>
      </div>
    </div>
  );
}
