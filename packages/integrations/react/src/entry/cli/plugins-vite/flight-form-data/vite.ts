import type { Plugin } from "vite";
import { PACKAGE_NAME } from "#/constants.ts";

const FLIGHT_SERVER_ID = /react-server-dom[^/\\]*-server\.[^/\\]+\.js$/;
const FORM_DATA_CHECK = /"function" === typeof FormData && (\w+) instanceof FormData/g;

export const pluginWrenFlightFormData = (): Plugin => ({
  applyToEnvironment: (env) => env.name === "rsc",
  name: `${PACKAGE_NAME}:flight-form-data`,
  transform: {
    filter: { code: "typeof FormData", id: FLIGHT_SERVER_ID },
    handler(code) {
      const guarded = code.replaceAll(
        FORM_DATA_CHECK,
        '$1?.[Symbol.toStringTag] === "FormData" && $1 instanceof FormData',
      );
      return guarded === code ? undefined : { code: guarded, map: null };
    },
  },
});
