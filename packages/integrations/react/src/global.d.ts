/// <reference types="@wrenjs/core/types" />

import type { ReactNode } from "react";

declare global {
	namespace Wren {
		interface Integration {
			node: ReactNode;
		}
	}
}
