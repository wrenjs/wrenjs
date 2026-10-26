import type { ConfigEnv, UserConfig as ViteUserConfig } from "vite";

export interface WrenAdapter {
  name: string;
  viteConfig(config: WrenConfig, env: ConfigEnv): Promise<ViteUserConfig> | ViteUserConfig;
}

export interface WrenConfig {
  /**
   * Hosting adapter that prepares the build output for a deployment target.
   *
   * An adapter is a `{ name, viteConfig }` object. `viteConfig` receives the resolved `WrenConfig`
   * and returns Vite configuration (plugins, environments, ...) that is merged into Wren's, so it
   * can generate platform-specific output during `wren build`.
   *
   * Without an adapter, Wren's default build output remains unchanged.
   *
   * @default undefined
   */
  adapter?: WrenAdapter;
  /**
   * Configuration options related to the build output.
   */
  build?: {
    /**
     * If client CSS assets should be inlined into the per-route HTML for prerendered output.
     *
     * | Value | Behavior |
     * | :---: | :--- |
     * | `true` | Inline all CSS assets. |
     * | `false` | Do not inline any CSS assets. |
     * | `number` | Inline assets smaller than the specified size in bytes. |
     *
     * @default false
     */
    inlineCSS?: boolean | number;

    /**
     * Defines the output format for the build.
     *
     * | Value    | Behavior |
     * | :---: | :--- |
     * | `static` | Output a static site with prerendered assets for each route. Intended for deployment to static hosting. |
     * | `server` | Output a server-rendered application. Intended for deployment to a host which supports execution of server-side code. Note that `output: "server"` can still have static routes and assets. |
     *
     * @default "server"
     */
    output?: "server" | "static";

    prerender?: {
      /** Origin used by build-time requests; no HTTP server is started. */
      origin?: string;
    };
  };

  /**
   * Rendering integrations used by the application.
   *
   * Integrations contribute framework-specific Vite environments, runtime
   * entries, and plugins.
   *
   * @default undefined
   */
  integrations?: WrenIntegration[];

  /**
   * Directory used for file-based routing, relative to the project root. Routes are determined by
   * the file structure within it.
   *
   * @default "src/pages"
   */
  router?: string;
  /**
   * Allows you to provide custom Vite configuration options. These options will be merged with wren's vite configuration, with these options taking precedence in case of conflicts.
   * @default undefined
   * @see https://vitejs.dev/config/ for more details on Vite configuration options.
   */
  vite?: ViteUserConfig;
}

export interface WrenIntegration {
  name: string;
  /** Server entry exporting the framework-neutral PrerenderRuntime contract. */
  prerender?: { entry: string; environment: string };
  server?: { entry: string; environment: string };
  viteConfig(config: WrenConfig, env: ConfigEnv): Promise<ViteUserConfig> | ViteUserConfig;
}
