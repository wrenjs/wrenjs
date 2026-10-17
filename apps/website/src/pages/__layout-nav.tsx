import type { ComponentChildren } from "preact";
import Link from "@wren-js/core/link";
import { WrenLogo } from "#/components/brand/logo";
import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import { DOCS_NAV_LINKS, MAIN_NAV_LINKS } from "#/constants";
import { cn } from "#/utils/cn";
import styles from "./__layout-nav.module.css";

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      "wren-nav-menu": IntrinsicElements["div"];
    }
  }
}

const PANEL_ID = "wren-nav-menu-panel";

export interface NavMenuProps {
  children: ComponentChildren;
  class?: string;
}

export function NavMenu({ children, class: className }: NavMenuProps) {
  return (
    <>
      <wren-nav-menu class={cn(styles.root, ":uno: relative", className)}>{children}</wren-nav-menu>
      <script src="./__layout-nav.script.ts" type="module" />
    </>
  );
}

export function NavMenuPanel({ children, class: className }: NavMenuProps) {
  return (
    <Glass
      class={cn(
        styles.panel,
        ":uno: absolute bottom-full left-0 mb-2 flex min-w-60 max-h-[calc(100dvh-5rem)] flex-col overflow-y-auto overscroll-contain p-1.5 rounded-[1.375rem] [scrollbar-width:thin] [&>*]:shrink-0",
        className,
      )}
      data-nav-menu-panel
      id={PANEL_ID}
    >
      {children}
    </Glass>
  );
}

export function NavMenuToggle({ class: className }: Pick<NavMenuProps, "class">) {
  return (
    <button
      aria-controls={PANEL_ID}
      aria-expanded="false"
      aria-label="Navigation menu"
      class={cn(
        ":uno: inline-flex h-10 w-8 justify-end mr-2 shrink-0 items-center rounded-full px-2 text-gray-800 rounded-r-full touch-manipulation",
        className,
      )}
      data-nav-menu-toggle
      type="button"
    >
      <span class=":uno: relative inline-flex size-4 items-center justify-center text-gray-800">
        <Icon class={cn(styles.icon, styles.iconMenu, ":uno: absolute")} name="i-lucide:menu" />
        <Icon class={cn(styles.icon, styles.iconClose, ":uno: absolute")} name="i-lucide:x" />
      </span>
    </button>
  );
}

const LINKS = (path: string, links = MAIN_NAV_LINKS) =>
  links.map((link) => (
    <Link
      class={cn(
        ":uno: inline-flex h-10 transition-height px-2 lg:px-4 items-center rounded-full relative select-none touch-manipulation active:bg-black/5",
        path === link.href ? "text-blue" : "text-gray-800",
      )}
      data-prefetch="hover"
      href={link.href}
      key={link.href}
    >
      <Icon class=":uno: mr-2 self-center text-gray-500" name={link.icon} />
      {link.label}
    </Link>
  ));

const DOCS_LINKS = (path: string) =>
  DOCS_NAV_LINKS.map(({ label, links }) => (
    <details class={styles.docsGroup} key={label}>
      <summary class=":uno: flex min-h-10 items-center justify-between gap-2 rounded-xl px-2 text-gray-700 cursor-pointer list-none select-none touch-manipulation active:bg-black/5 [&::-webkit-details-marker]:hidden">
        {label}
        <Icon
          class={cn(styles.docsChevron, ":uno: size-3.5 shrink-0 text-gray-500")}
          name="i-lucide:chevron-down"
        />
      </summary>
      <div class=":uno: flex min-h-0 flex-col overflow-hidden ps-3">{LINKS(path, links)}</div>
    </details>
  ));

const EXTRA_LINKS = [
  {
    href: "https://github.com/wrenjs/wrenjs",
    icon: "i-lucide:github",
    label: "GitHub",
  },
].map((link) => (
  <Link
    class=":uno: inline-flex h-10 transition-height px-2 lg:px-4 items-center rounded-full text-gray-800 relative select-none active:bg-black/5"
    data-prefetch="hover"
    href={link.href}
  >
    <Icon class=":uno: mr-2 self-center text-gray-500" name={link.icon} />
    {link.label}
    <Icon class=":uno: ml-2 text-gray-500" name="i-lucide:arrow-up-right" />
  </Link>
));

export function Nav({ path }: { path: string }) {
  const isDocs = path === "/docs" || path.startsWith("/docs/");
  const links = isDocs ? DOCS_NAV_LINKS.flatMap((group) => group.links) : MAIN_NAV_LINKS;
  const current = links.find((link) => path === link.href);
  return (
    <nav class=":uno: fixed bottom-0 inset-x-0 z-10 mb-3 text-sm font-medium opacity-100 transition-opacity duration-500">
      <div class=":uno: flex h-10 transition-height items-center justify-center">
        <NavMenu class=":uno: flex h-full items-center">
          <Glass class=":uno: rounded-full relative flex items-center gap-2">
            <div class=":uno: flex items-center bg-white/75 rounded-full pr-4 border border-black/5">
              <Link
                class=":uno: inline-block h-10 pt-3 lg:pt-2 transition-height p-2 -mr-2 leading-[0] text-gray-500 rounded-full overflow-clip"
                data-prefetch="hover"
                href="/"
                title="Go Home"
              >
                <WrenLogo />
              </Link>
              <span class=":uno: ml-2 flex items-center gap-2 text-3.5">
                {current && <Icon class=":uno: text-gray-500" name={current.icon} />}
                {current?.label}
              </span>
            </div>
            <NavMenuToggle />
          </Glass>
          <NavMenuPanel>
            {LINKS(path)}
            <hr className=":uno: my-2 border-t border-gray-200" />
            {isDocs && (
              <>
                {DOCS_LINKS(path)}
                <hr className=":uno: my-2 border-t border-gray-200" />
              </>
            )}
            {EXTRA_LINKS}
          </NavMenuPanel>
        </NavMenu>
      </div>
    </nav>
  );
}
