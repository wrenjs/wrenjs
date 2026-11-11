/// <reference types="@wrenjs/core/types" />

import "@lumeland/ssx/jsx-runtime";

declare global {
	namespace Wren {
		interface Integration {
			node: JSX.Children;
		}
	}
}
