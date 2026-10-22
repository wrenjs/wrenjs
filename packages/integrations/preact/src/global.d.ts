/// <reference types="@wren-js/core/types" />

import type { ComponentChildren, VNode } from "preact";

declare global {
  namespace Wren {
    interface Integration {
      head: VNode;
      node: ComponentChildren;
    }
  }
}
