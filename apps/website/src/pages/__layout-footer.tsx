const FOOTER_LINKS = [
  {
    group: "Resources",
    links: [
      { href: "/docs", name: "Documentation" },
      { href: "/examples", name: "Examples" },
      { href: "https://github.com/wrenjs", name: "GitHub" },
    ],
  },
  {
    group: "Community",
    links: [
      { href: "#TBD", name: "Discord" },
      { href: "#TBD", name: "Twitter" },
      { href: "/blog", name: "Blog" },
      { href: "/showcase", name: "Showcase" },
    ],
  },
];
export function LayoutFooter() {
  return (
    <footer class=":uno: bg-white p-4 pt-8 text-gray-600 pb-17.5 text-4 rounded-t-8 border-t-bg border-t-2">
      <div class=":uno: mx-auto flex flex-col gap-3 max-w-[1180px] px-4">
        <a
          class=":uno: text-gray-600 text-3"
          href="https://www.github.com/wrenjs/wrenjs/blob/trunk/LICENSE.md"
        >
          MIT License &copy; {new Date().getFullYear()}
        </a>
        <section class=":uno: mt-3 flex gap-6">
          {FOOTER_LINKS.map((group) => (
            <nav class=":uno: flex flex-col gap-1">
              <h4 class=":uno: font-semibold" id={group.group.toLowerCase()}>
                {group.group}
              </h4>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      aria-labelledby={group.group.toLowerCase()}
                      class=":uno: hover:underline text-gray-500 py-0.5 inline-block"
                      href={link.href}
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </section>
      </div>
    </footer>
  );
}
