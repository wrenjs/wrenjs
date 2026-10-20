import type { ConfigEnv, UserConfig as ViteUserConfig } from "vite";

export interface WrenAdapter {
  name: string;
  viteConfig(config: WrenConfig, env: ConfigEnv): Promise<ViteUserConfig> | ViteUserConfig;
}

export interface WrenConfig {
  /**
   * Hosting adapter plugins that hook into the Vite build pipeline.
   *
   * Each adapter is a standard Vite `Plugin` and can use any Vite plugin hooks
   * to generate platform-specific output during `wren build`.
   *
   * The adapter receives the resolved `WrenConfig`.
   *
   * If no adapters are specified, Wren's default build output remains unchanged.
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

    // /**
    //  * If client JS assets should be inlined into the per-route HTML for prerendered output.
    //  *
    //  * | Value | Behavior |
    //  * | :---: | :--- |
    //  * | `true` | Inline all JS assets. |
    //  * | `false` | Do not inline any JS assets. |
    //  * | `number` | Inline assets smaller than the specified size in bytes. |
    //  *
    //  * @default false
    //  */
    // inlineJS?: boolean | number;

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
   * Defines the routing strategy used by the application.
   *
   * | Value    | Behavior |
   * | :---: | :--- |
   * | `string` | Use a file-based routing strategy where routes are determined by the file structure, at the specified directory. |
   * | `() => Config` | Use a code-based routing strategy where routes are determined programmatically. |
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
