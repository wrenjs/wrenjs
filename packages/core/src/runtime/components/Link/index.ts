// Pages rendering a `<wren-link>` get its browser runtime hoisted as a page script.
import "virtual:wrenjs-hoist:virtual:wrenjs-link-script";

// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const Link = "wren-link" as "a";

export default Link;
