export const LS_PKG_KEY = "wren:pkg";
export const LS_THEME_KEY = "wren:theme";
export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun", "aube", "ni"];

export const DOCS_NAV_LINKS = [
	{
		label: "Get started",
		links: [
			{ href: "/docs/getting-started", icon: "i-lucide:rocket", label: "Getting started" },
			{ href: "/docs/project-structure", icon: "i-lucide:folder", label: "Project Structure" },
		],
	},
	{
		label: "Routing",
		links: [
			{
				href: "/docs/routing/file/structure",
				icon: "i-lucide:folder-tree",
				label: "File-based",
			},
		],
	},
];

export const MAIN_NAV_LINKS = [
	{
		href: "/",
		icon: "i-lucide:house",
		label: "Home",
	},
	{
		href: "/docs/getting-started",
		icon: "i-lucide:book",
		label: "Docs",
	},
	// {
	//   label: "Examples",
	//   href: "/examples",
	//   icon: "i-lucide:code",
	// },
	// {
	//   label: "Blog",
	//   href: "/blog",
	//   icon: "i-lucide--pen-tool",
	// },
	// {
	//   label: "Showcase",
	//   href: "/showcase",
	//   icon: "i-lucide--paintbrush",
	// },
];
