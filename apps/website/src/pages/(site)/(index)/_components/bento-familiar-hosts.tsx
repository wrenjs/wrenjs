import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import styles from "./bento.module.css";

export function BentoFamiliarHosts() {
  return (
    <div class=":uno: flex flex-col gap-2">
      <h3 class=":uno: text-4 font-semibold">Hosts</h3>

      <div class={styles.bento}>
        <Glass class={styles.tile}>
          <Icon alt="Cloudflare" class=":uno: size-3/5" name="i-simple-icons:cloudflare" />
        </Glass>

        <Glass class={styles.tile}>
          <Icon alt="Vercel" class=":uno: size-3/5" name="i-simple-icons:vercel" />
        </Glass>

        <Glass class={styles.tile}>
          <Icon alt="Netlify" class=":uno: size-3/5" name="i-simple-icons:netlify" />
        </Glass>

        <Glass class={`${styles.tile} ${styles.tileFolder}`}>
          <div class={styles.mini}>
            <Icon alt="Node.js" class=":uno: size-7/8" name="i-simple-icons:nodedotjs" />
          </div>
          <div class={styles.mini}>
            <Icon alt="Deno" class=":uno: size-7/8" name="i-simple-icons:deno" />
          </div>
          <div class={styles.mini}>
            <Icon alt="Bun" class=":uno: size-7/8" name="i-simple-icons:bun" />
          </div>
          <div class={styles.mini}>
            <Icon alt="Docker" class=":uno: size-7/8" name="i-simple-icons:docker" />
          </div>
        </Glass>
      </div>
    </div>
  );
}
