"use client";

import type { ComponentChildren, MouseEventHandler, TargetedMouseEvent } from "preact";
import { useComputed, useSignal } from "@preact/signals";
import Link from "@wren-js/core/link";
import { useLayoutEffect, useRef } from "preact/hooks";
import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import { DOCS_NAV_LINKS } from "#/constants";
import { cn } from "#/utils/cn";
import styles from "./__layout.module.css";

interface Heading {
  depth: number;
  element: HTMLElement;
  id: string;
  label: string;
}

interface OutlineGroup {
  children: Heading[];
  heading: Heading;
}

export function DocsNavigation({ children, path }: { children: ComponentChildren; path: string }) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLElement>(null);
  const docsMenu = useRef<HTMLDetailsElement>(null);
  const outlineMenu = useRef<HTMLDetailsElement>(null);
  const headings = useSignal<Heading[]>([]);
  const activeId = useSignal("");
  const openMenu = useSignal<"docs" | "outline" | null>(null);
  const groups = useComputed(() => {
    const result: OutlineGroup[] = [];
    for (const heading of headings.value) {
      const parent = result.at(-1);
      if (heading.depth === 3 && parent?.heading.depth === 2) {
        parent.children.push(heading);
      } else {
        result.push({ children: [], heading });
      }
    }
    return result;
  });

  useLayoutEffect(() => {
    const element = root.current;
    const main = content.current;
    if (!element || !main) {
      throw new Error("Docs navigation markup is missing");
    }
    const entries = readHeadings(main);
    headings.value = entries;
    const listeners = new AbortController();
    const { signal } = listeners;
    let frame = 0;
    const closeMenus = () => {
      openMenu.value = null;
    };
    const currentMenu = () => (openMenu.peek() === "docs" ? docsMenu.current : outlineMenu.current);
    const updateActive = () => {
      frame = 0;
      let active: Heading | undefined = entries[0];
      const offset = Number.parseFloat(getComputedStyle(main).scrollMarginTop) + 16;
      for (const heading of entries) {
        if (heading.element.getBoundingClientRect().top > offset) break;
        active = heading;
      }
      if (
        window.scrollY > 0 &&
        Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2
      ) {
        active = entries.at(-1);
      }
      activeId.value = active?.id ?? "";
    };
    const scheduleUpdate = () => {
      if (!frame) frame = requestAnimationFrame(updateActive);
    };
    const dismissOutside = (event: Event) => {
      const menu = currentMenu();
      if (event.target instanceof Node && menu && !menu.contains(event.target)) {
        closeMenus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside, { signal });
    document.addEventListener("focusin", dismissOutside, { signal });
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && openMenu.peek()) {
          event.preventDefault();
          const menu = currentMenu();
          closeMenus();
          menu?.querySelector("summary")?.focus({ preventScroll: true });
        }
      },
      { signal },
    );
    window.addEventListener("scroll", scheduleUpdate, { passive: true, signal });
    window.addEventListener("resize", scheduleUpdate, { signal });
    window.addEventListener("hashchange", scheduleUpdate, { signal });
    for (const breakpoint of ["(min-width: 64rem)", "(min-width: 80rem)"]) {
      window.matchMedia(breakpoint).addEventListener("change", closeMenus, { signal });
    }
    const resize = new ResizeObserver(() => {
      if (element.isConnected) scheduleUpdate();
      else cleanup();
    });
    resize.observe(main);
    const target = entries.find(
      ({ id }) => location.hash === `#${encodeURIComponent(id)}` || location.hash === `#${id}`,
    );
    if (target && window.scrollY === 0) {
      target.element.scrollIntoView();
    }
    updateActive();

    function cleanup() {
      listeners.abort();
      resize.disconnect();
      cancelAnimationFrame(frame);
    }
    return cleanup;
  }, [activeId, headings, openMenu]);

  useLayoutEffect(() => {
    for (const link of root.current?.querySelectorAll<HTMLElement>('[aria-current="location"]') ??
      []) {
      const panel = link.closest<HTMLElement>("[data-docs-outline-scroll]");
      if (panel && panel.clientHeight > 0) {
        const bounds = panel.getBoundingClientRect();
        const position = link.getBoundingClientRect();
        if (position.top < bounds.top) {
          panel.scrollTop += position.top - bounds.top - 8;
        } else if (position.bottom > bounds.bottom) {
          panel.scrollTop += position.bottom - bounds.bottom + 8;
        }
      }
    }
  }, [activeId.value, openMenu.value]);

  function toggleMenu(event: TargetedMouseEvent<HTMLElement>, menu: "docs" | "outline") {
    event.preventDefault();
    openMenu.value = openMenu.peek() === menu ? null : menu;
  }

  function navigateOutline(event: TargetedMouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }
    const href = event.currentTarget.getAttribute("href");
    const target =
      href === "#docs-content"
        ? content.current
        : headings.peek().find(({ id }) => href === `#${encodeURIComponent(id)}`)?.element;
    openMenu.value = null;
    target?.focus({ preventScroll: true });
  }

  const outline = () => (
    <PageOutline activeId={activeId.value} groups={groups.value} onNavigate={navigateOutline} />
  );

  return (
    <div class={styles.root} data-docs-layout ref={root}>
      <a class={styles.skipLink} href="#docs-content">
        Skip to content
      </a>
      <div class={cn(styles.mobileBar, ":uno: sticky top-0 z-20 xl:hidden")}>
        <div class=":uno: relative mx-auto flex h-14 max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:justify-end lg:px-8">
          <details
            class={cn(styles.menu, ":uno: lg:hidden")}
            data-docs-menu
            open={openMenu.value === "docs"}
            ref={docsMenu}
          >
            <summary class={styles.menuToggle} onClick={(event) => toggleMenu(event, "docs")}>
              <Icon class=":uno: size-4 text-gray-500" name="i-lucide:panel-left" />
              Documentation
              <Icon class={styles.chevron} name="i-lucide:chevron-down" />
            </summary>
            <div class={styles.menuPanel}>
              <DocsLinks onNavigate={() => (openMenu.value = null)} path={path} />
            </div>
          </details>
          <details
            class={styles.menu}
            data-docs-menu
            data-docs-outline
            hidden={headings.value.length === 0}
            open={openMenu.value === "outline"}
            ref={outlineMenu}
          >
            <summary class={styles.menuToggle} onClick={(event) => toggleMenu(event, "outline")}>
              <Icon class=":uno: size-4 text-gray-500" name="i-lucide:list" />
              On this page
              <Icon class={styles.chevron} name="i-lucide:chevron-down" />
            </summary>
            <div class={styles.menuPanel} data-docs-outline-scroll>
              {outline()}
            </div>
          </details>
        </div>
      </div>
      <div class=":uno: mx-auto grid min-h-[80svh] max-w-[1480px] grid-cols-[minmax(0,1fr)] gap-x-8 px-4 pb-20 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:px-8 xl:grid-cols-[14rem_minmax(0,1fr)_13rem] xl:gap-x-10">
        <aside class=":uno: hidden min-w-0 lg:block">
          <div class={cn(styles.rail, ":uno: sticky top-8 pt-3 lg:top-22 xl:top-8")}>
            <DocsLinks path={path} />
          </div>
        </aside>
        <main
          class={cn(styles.markdown, ":uno: mx-auto w-full min-w-0 max-w-[52rem] pt-8 lg:pt-12")}
          data-docs-content
          id="docs-content"
          ref={content}
          tabIndex={-1}
        >
          {children}
        </main>
        <aside
          class=":uno: hidden min-w-0 xl:block"
          data-docs-outline
          hidden={headings.value.length === 0}
        >
          <div class={cn(styles.rail, ":uno: sticky top-8 pt-4")} data-docs-outline-scroll>
            <p class=":uno: mb-4 flex items-center gap-2 px-3 text-xs font-semibold text-gray-700">
              <Icon class=":uno: size-3.5 text-gray-400" name="i-lucide:list" />
              On this page
            </p>
            {outline()}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DocsLinks({ onNavigate, path }: { onNavigate?: () => void; path: string }) {
  return (
    <nav aria-label="Documentation">
      <p class=":uno: mb-3 px-3 text-xs font-semibold tracking-wide text-gray-500">Get started</p>
      <ul class=":uno: flex flex-col gap-1">
        {DOCS_NAV_LINKS.map(({ href, icon, label }) => {
          const match = path === href;
          const Wrapper = match ? Glass : "div";
          return (
            <li key={href}>
              <Wrapper class="min-h-10 flex items-center rounded-xl block text-sm font-medium">
                <Link
                  aria-current={path === href ? "page" : undefined}
                  class={cn(
                    styles.navLink,
                    ":uno: flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-gray-500 hover:text-gray-900",
                  )}
                  data-prefetch="hover"
                  href={href}
                  onClick={onNavigate}
                >
                  <Icon class=":uno: size-4 shrink-0" name={icon} />
                  {label}
                </Link>
              </Wrapper>
            </li>
          );
        })}
      </ul>
      <div class=":uno: mt-6 border-t border-gray-200/70 pt-4">
        <a
          class={cn(
            styles.navLink,
            ":uno: flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm",
          )}
          href="https://github.com/wrenjs/wrenjs"
          onClick={onNavigate}
        >
          <Icon class=":uno: size-4 shrink-0" name="i-lucide:github" />
          GitHub
          <Icon class=":uno: ml-auto size-3.5 text-gray-400" name="i-lucide:arrow-up-right" />
        </a>
      </div>
    </nav>
  );
}

function PageOutline({
  activeId,
  groups,
  onNavigate,
}: {
  activeId: string;
  groups: OutlineGroup[];
  onNavigate: MouseEventHandler<HTMLAnchorElement>;
}) {
  const link = (heading: Heading) => (
    <a
      aria-current={activeId === heading.id ? "location" : undefined}
      href={`#${encodeURIComponent(heading.id)}`}
      onClick={onNavigate}
    >
      {heading.label}
    </a>
  );

  return (
    <nav aria-label="On this page">
      <ol class={styles.outlineList} data-docs-outline-list>
        {groups.map((group) => (
          <li key={group.heading.id}>
            {link(group.heading)}
            {group.children.length > 0 && (
              <ol>
                {group.children.map((heading) => (
                  <li key={heading.id}>{link(heading)}</li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
      <a
        class={cn(
          styles.backToTop,
          ":uno: mt-5 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs",
        )}
        href="#docs-content"
        onClick={onNavigate}
      >
        <Icon class=":uno: size-3.5" name="i-lucide:arrow-up" />
        Back to top
      </a>
    </nav>
  );
}

function readHeadings(content: HTMLElement): Heading[] {
  return Array.from(content.querySelectorAll<HTMLElement>("h2, h3")).flatMap((element) => {
    const text = document.createElement("span");
    text.append(element.cloneNode(true));
    for (const decoration of text.querySelectorAll("wren-glass, script, [aria-hidden='true']")) {
      decoration.remove();
    }
    const label = text.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (!label) return [];
    if (!element.id) {
      const slug =
        label
          .normalize("NFKD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase()
          .match(/[\p{L}\p{N}]+/gu)
          ?.join("-") || "section";
      let id = slug;
      let suffix = 1;
      while (document.getElementById(id)) {
        id = `${slug}-${suffix++}`;
      }
      element.id = id;
    }
    element.tabIndex = -1;
    return [{ depth: Number(element.tagName.slice(1)), element, id: element.id, label }];
  });
}
