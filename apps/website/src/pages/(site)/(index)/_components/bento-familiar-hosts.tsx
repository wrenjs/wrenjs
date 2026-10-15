import Link from "@wren-js/core/link";
import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import styles from "./bento.module.css";

export function BentoFamiliarHosts() {
  return (
    <div class=":uno: flex flex-col gap-2">
      <h3 class=":uno: text-4 font-semibold">Hosts</h3>

      <div class={styles.bento}>
        <Glass class={styles.tile}>
          <Link
            class="absolute size-full inset-0 grid place-items-center"
            href="https://www.cloudflare.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon alt="Cloudflare" class=":uno: size-3/5" name="i-simple-icons:cloudflare" />
          </Link>
        </Glass>

        <Glass class={styles.tile}>
          <Link
            class="absolute size-full inset-0 grid place-items-center"
            href="https://vercel.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon alt="Vercel" class=":uno: size-3/5" name="i-simple-icons:vercel" />
          </Link>
        </Glass>

        <Glass class={styles.tile}>
          <Link
            class="absolute size-full inset-0 grid place-items-center"
            href="https://www.netlify.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon alt="Netlify" class=":uno: size-3/5" name="i-simple-icons:netlify" />
          </Link>
        </Glass>

        <Glass class={`${styles.tile} ${styles.tileFolder}`}>
          <div class={styles.mini}>
            <Link
              class="absolute size-full inset-0 grid place-items-center"
              href="https://nodejs.org/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon alt="Node.js" class=":uno: size-7/8" name="i-simple-icons:nodedotjs" />
            </Link>
          </div>
          <div class={styles.mini}>
            <Link
              class="absolute size-full inset-0 grid place-items-center"
              href="https://deno.land/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon alt="Deno" class=":uno: size-7/8" name="i-simple-icons:deno" />
            </Link>
          </div>
          <div class={styles.mini}>
            <Link
              class="absolute size-full inset-0 grid place-items-center"
              href="https://bun.sh/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon alt="Bun" class=":uno: size-7/8" name="i-simple-icons:bun" />
            </Link>
          </div>
          <div class={styles.mini}>
            <Link
              class="absolute size-full inset-0 grid place-items-center"
              href="https://www.docker.com/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon alt="Docker" class=":uno: size-7/8" name="i-simple-icons:docker" />
            </Link>
          </div>
        </Glass>
      </div>
    </div>
  );
}
