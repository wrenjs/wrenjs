/// <reference types="@wren-js/core/types" />

import "@lumeland/ssx/jsx-runtime";

declare global {
  namespace Wren {
    interface Integration {
      node: JSX.Children;
    }
  }
}
