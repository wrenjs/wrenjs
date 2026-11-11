import { defineConfig } from "@wrenjs/core/config";
import preact from "@wrenjs/preact";

export default defineConfig({
  integrations: [preact()],
});
