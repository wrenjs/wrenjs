import Link from "@wren-js/core/link";
import { WrenLogo } from "#/components/brand/logo";
import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import { cn } from "#/utils/cn";
import styles from "./__layout-nav.module.css";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "wren-nav-menu": IntrinsicElements["div"];
    }
  }
}

const PANEL_ID = "wren-nav-menu-panel";

export interface NavMenuProps {
  children: JSX.Children;
  class?: string;
}

export function NavMenu({ children, class: className }: NavMenuProps) {
  return (
    <>
      <wren-nav-menu class={cn(styles.root, className)}>{children}</wren-nav-menu>
      <script src="./__layout-nav.script.ts" type="module" />
    </>
  );
}

export function NavMenuPanel({ children, class: className }: NavMenuProps) {
  return (
    <Glass
      class={cn(
        styles.panel,
        ":uno: lg:hidden absolute bottom-full left-0 mb-2 flex min-w-44 flex-col p-1.5 rounded-[1.375rem]",
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
      class={cn(
        ":uno: lg:hidden inline-flex h-10 w-26 justify-end mr-2 shrink-0 items-center rounded-full px-2 text-gray-800 rounded-r-full touch-manipulation",
        className,
      )}
      data-nav-menu-toggle
      type="button"
    >
      <span class=":uno: relative inline-flex size-4 items-center justify-center text-gray-800">
        <Icon class={cn(styles.icon, styles.iconMenu)} name="i-lucide:menu" />
        <Icon class={cn(styles.icon, styles.iconClose)} name="i-lucide:x" />
      </span>
    </button>
  );
}

const LINKS = (path: string) =>
  [
    {
      children: "Docs",
      href: "/docs",
      icon: "i-lucide:book",
    },
    {
      children: "Examples",
      href: "/examples",
      icon: "i-lucide:code",
    },
    {
      children: "Blog",
      href: "/blog",
      icon: "i-lucide:edit",
    },
    {
      children: "Showcase",
      href: "/showcase",
      icon: "i-lucide:paintbrush",
    },
  ].map((link) => (
    <Link
      class={cn(
        ":uno: inline-flex h-10 transition-height lg:h-8.5 px-2 lg:px-4 items-center rounded-full relative select-none touch-manipulation",
        path === link.href ? "text-blue" : "text-gray-800",
      )}
      data-prefetch="hover"
      href={link.href}
    >
      <Icon class=":uno: mr-2 self-center text-gray-500" name={link.icon} />
      {link.children}
    </Link>
  ));

const EXTRA_LINKS = [
  {
    children: "GitHub",
    href: "https://github.com/wrenjs/wrenjs",
    icon: "i-lucide:github",
  },
].map((link) => (
  <Link
    class=":uno: inline-flex h-10 transition-height lg:h-8.5 px-2 lg:px-4 items-center rounded-full text-gray-800 relative select-none"
    data-prefetch="hover"
    href={link.href}
  >
    <Icon class=":uno: mr-2 self-center text-gray-500" name={link.icon} />
    {link.children}
    <Icon class=":uno: ml-2 text-gray-500" name="i-lucide:arrow-up-right" />
  </Link>
));

export function Nav({ path }: { path: string }) {
  console.log("Current path:", path);
  return (
    <nav class=":uno: fixed bottom-0 inset-x-0 z-10 mb-3 text-sm font-medium opacity-100 transition-opacity duration-500">
      <div class=":uno: flex h-10 transition-height lg:h-8.5 items-center justify-center">
        <NavMenu class=":uno: flex h-full items-center">
          <Glass class=":uno: rounded-full relative flex items-center gap-2 lg:rounded-r-none">
            <Link
              class=":uno: inline-block h-10 pt-3 lg:pt-2 transition-height lg:h-8.5 p-2 -mr-2 leading-[0] text-gray-500 rounded-full overflow-clip"
              data-prefetch="hover"
              href="/"
              title="Go Home"
            >
              <WrenLogo />
            </Link>
            <NavMenuToggle />
            <div class=":uno: hidden h-full items-center rounded-full lg:flex">{LINKS(path)}</div>
          </Glass>
          <Glass class=":uno: rounded-full relative hidden lg:flex items-center rounded-l-none rounded-r-full">
            {EXTRA_LINKS}
          </Glass>
          {}
          <NavMenuPanel>
            {LINKS(path)}
            <hr className=":uno: my-2 border-t border-gray-200" />
            {EXTRA_LINKS}
          </NavMenuPanel>
        </NavMenu>
      </div>
    </nav>
  );
}
