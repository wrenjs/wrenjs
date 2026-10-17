"use client";

import type { ComponentChildren, TargetedMouseEvent } from "preact";
import { useSignal } from "@preact/signals";
import Link from "@wren-js/core/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef } from "preact/hooks";
import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import { DOCS_NAV_LINKS } from "#/constants";
import { cn } from "#/utils/cn";
import styles from "./__layout.module.css";

export interface Heading {
  depth: 2 | 3;
  id: string;
  label: string;
}

interface OutlineGroup {
  children: Heading[];
  heading: Heading;
}

export function DocsNavigation({
  children,
  headings,
  path,
}: {
  children: ComponentChildren;
  headings: Heading[];
  path: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLElement>(null);
  const menuName = useId();
  const activeId = useSignal(headings[0]?.id ?? "");
  const groups = useMemo(() => {
    const result: OutlineGroup[] = [];
    for (const heading of headings) {
      const parent = result.at(-1);
      if (heading.depth === 3 && parent?.heading.depth === 2) {
        parent.children.push(heading);
      } else {
        result.push({ children: [], heading });
      }
    }
    return result;
  }, [headings]);

  useEffect(() => {
    const element = root.current;
    const main = content.current;
    if (!element || !main) {
      throw new Error("Docs navigation markup is missing");
    }
    if (!element.isConnected) return undefined;
    const entries = headings.map(({ id }) => {
      const target = document.getElementById(id);
      if (!target || !main.contains(target)) {
        throw new Error(`Documentation heading "${id}" is missing`);
      }
      return { element: target, id };
    });
    const listeners = new AbortController();
    const { signal } = listeners;
    let frame = 0;
    const currentMenu = () =>
      element.querySelector<HTMLDetailsElement>(`details[name="${menuName}"][open]`);
    const closeMenus = () => currentMenu()?.removeAttribute("open");
    const updateActive = () => {
      frame = 0;
      let active = entries.at(0);
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
        menu.removeAttribute("open");
      }
    };
    document.addEventListener("pointerdown", dismissOutside, { signal });
    document.addEventListener("focusin", dismissOutside, { signal });
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape") return;
        const menu = currentMenu();
        if (!menu) return;
        event.preventDefault();
        menu.removeAttribute("open");
        menu.querySelector("summary")?.focus({ preventScroll: true });
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
    updateActive();

    function cleanup() {
      listeners.abort();
      resize.disconnect();
      cancelAnimationFrame(frame);
    }
    return cleanup;
  }, [activeId, headings, menuName]);

  useLayoutEffect(() => scrollActiveLinks(root.current), [activeId.value]);

  const outline = () => <PageOutline activeId={activeId.value} groups={groups} />;

  return (
    <div class={styles.root} ref={root}>
      <a
        class={cn(
          styles.skipLink,
          ":uno: fixed! top-3 left-3 z-30 rounded-xl bg-bg px-4 py-3 text-[var(--docs-accent)] shadow-[0_4px_24px_#00000012]",
        )}
        href="#docs-content"
      >
        Skip to content
      </a>
      <div
        class={cn(
          styles.mobileBar,
          ":uno: sticky top-0 z-20 border-b border-[#00000009] backdrop-blur-[16px] xl:hidden",
        )}
      >
        <div class=":uno: relative mx-auto flex h-14 max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:justify-end lg:px-8">
          <details class={cn(styles.menu, ":uno: lg:hidden")} name={menuName}>
            <summary class=":uno: docs-menu-toggle">
              <Icon class=":uno: size-4 text-gray-500" name="i-lucide:panel-left" />
              Documentation
              <Icon
                class={cn(styles.chevron, ":uno: size-3.5 text-gray-400")}
                name="i-lucide:chevron-down"
              />
            </summary>
            <div class=":uno: docs-menu-panel">
              <DocsLinks path={path} />
            </div>
          </details>
          <details
            class={styles.menu}
            hidden={headings.length === 0}
            name={menuName}
            onToggle={(event) => scrollActiveLinks(event.currentTarget)}
          >
            <summary class=":uno: docs-menu-toggle">
              <Icon class=":uno: size-4 text-gray-500" name="i-lucide:list" />
              On this page
              <Icon
                class={cn(styles.chevron, ":uno: size-3.5 text-gray-400")}
                name="i-lucide:chevron-down"
              />
            </summary>
            <div class=":uno: docs-menu-panel" data-docs-outline-scroll>
              {outline()}
            </div>
          </details>
        </div>
      </div>
      <div class=":uno: mx-auto grid min-h-[80svh] max-w-[1480px] grid-cols-[minmax(0,1fr)] gap-x-8 px-4 pb-20 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:px-8 xl:grid-cols-[14rem_minmax(0,1fr)_13rem] xl:gap-x-10">
        <aside class=":uno: hidden min-w-0 lg:block">
          <div class=":uno: docs-rail sticky top-8 pt-3 lg:top-22 xl:top-8">
            <DocsLinks path={path} />
          </div>
        </aside>
        <main
          class={cn(
            styles.markdown,
            ":uno: mx-auto w-full min-w-0 max-w-[52rem] scroll-mt-24 pt-8 text-[0.9rem] break-words lg:pt-12",
          )}
          id="docs-content"
          ref={content}
          tabIndex={-1}
        >
          {children}
        </main>
        <aside class=":uno: hidden min-w-0 xl:block" hidden={headings.length === 0}>
          <div class=":uno: docs-rail sticky top-8 pt-4" data-docs-outline-scroll>
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

function closeMenu(event: TargetedMouseEvent<HTMLAnchorElement>) {
  event.currentTarget.closest("details")?.removeAttribute("open");
}

function DocsLinks({ path }: { path: string }) {
  return (
    <nav aria-label="Documentation" class=":uno: flex flex-col gap-6">
      {DOCS_NAV_LINKS.map(({ label: group, links }) => (
        <div key={group}>
          <p class=":uno: mb-3 px-3 text-xs font-semibold tracking-wide text-gray-500">{group}</p>
          <ul class=":uno: flex flex-col gap-1">
            {links.map(({ href, icon, label }) => {
              const match = path === href;
              const Wrapper = match ? Glass : "div";
              return (
                <li key={href}>
                  <Wrapper class="min-h-10 flex items-center rounded-xl block text-sm font-medium">
                    <Link
                      aria-current={match ? "page" : undefined}
                      class={cn(
                        styles.navLink,
                        ":uno: flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-gray-500 hover:text-gray-900",
                      )}
                      data-prefetch="hover"
                      href={href}
                      onClick={closeMenu}
                    >
                      <Icon class=":uno: size-4 shrink-0" name={icon} />
                      {label}
                    </Link>
                  </Wrapper>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div class=":uno: border-t border-gray-200/70 pt-4">
        <a
          class={cn(
            styles.navLink,
            ":uno: flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm",
          )}
          href="https://github.com/wrenjs/wrenjs"
          onClick={closeMenu}
        >
          <Icon class=":uno: size-4 shrink-0" name="i-lucide:github" />
          GitHub
          <Icon class=":uno: ml-auto size-3.5 text-gray-400" name="i-lucide:arrow-up-right" />
        </a>
      </div>
    </nav>
  );
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
  const id = decodeURIComponent(event.currentTarget.hash.slice(1));
  closeMenu(event);
  document.getElementById(id)?.focus({ preventScroll: true });
}

function PageOutline({ activeId, groups }: { activeId: string; groups: OutlineGroup[] }) {
  const link = (heading: Heading) => (
    <a
      aria-current={activeId === heading.id ? "location" : undefined}
      class=":uno: block -ml-px border-l-2 border-transparent py-[0.4rem] pr-2 pl-3.5 text-gray-500 [overflow-wrap:anywhere] transition-colors duration-150 ease-[ease] hover:text-gray-900 aria-[current=location]:border-[var(--docs-accent)] aria-[current=location]:text-[var(--docs-accent)]!"
      href={`#${encodeURIComponent(heading.id)}`}
      onClick={navigateOutline}
    >
      {heading.label}
    </a>
  );

  return (
    <nav aria-label="On this page">
      <ol class=":uno: ml-3 border-l border-gray-200 text-[0.8125rem] leading-[1.5] list-none">
        {groups.map((group) => (
          <li key={group.heading.id}>
            {link(group.heading)}
            {group.children.length > 0 && (
              <ol class=":uno: pl-3.5 list-none">
                {group.children.map((heading) => (
                  <li key={heading.id}>{link(heading)}</li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
      <a
        class=":uno: mt-5 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs text-gray-500 transition-colors duration-150 ease-[ease] hover:bg-[#00000004] hover:text-gray-900"
        href="#docs-content"
        onClick={navigateOutline}
      >
        <Icon class=":uno: size-3.5" name="i-lucide:arrow-up" />
        Back to top
      </a>
    </nav>
  );
}

function scrollActiveLinks(root: HTMLElement | null) {
  for (const link of root?.querySelectorAll<HTMLElement>('[aria-current="location"]') ?? []) {
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
}
