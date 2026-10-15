import { Glass } from "#/components/glass";
import { Icon } from "#/components/icon";
import { PACKAGE_MANAGERS } from "#/constants";

export function PackageManagerSelect() {
  return (
    <>
      <wren-package-selector class=":uno: relative inline-block box-border">
        <div class=":uno: flex items-center h-full">
          <Glass class=":uno: inline-block h-full w-full min-w-[30ch] rounded-4 font-mono text-sm">
            <select
              aria-label="Package manager"
              class=":uno: block h-full rounded-4 w-full cursor-pointer appearance-none bg-transparent px-4 py-2 pr-6.5 font-mono text-sm text-gray-800 select-auto"
              id="package-manager-select"
            >
              <option disabled selected value="">
                {PACKAGE_MANAGERS[0]} create wrenjs@latest
              </option>
              {PACKAGE_MANAGERS.map((pkg) => (
                <option value={pkg}>{pkg}</option>
              ))}
            </select>
          </Glass>
          <Icon
            class=":uno: absolute top-0 right-2 h-full text-gray-500"
            name="i-lucide:chevron-down"
          />
        </div>

        <div aria-live="polite" class=":uno: absolute top-full left-0 z-50 mt-2" role="status">
          <div data-toast hidden>
            <Glass
              class=":uno: flex items-center gap-2 rounded-4 bg-gray-100 px-3 py-2 text-sm text-gray-800 shadow-md select-none"
              tint="#999"
            >
              <Icon class=":uno: size-3.5" name="i-lucide:clipboard" />
              <span data-toast-message />
            </Glass>
          </div>
        </div>
      </wren-package-selector>
      <script src="./package-selector.script.ts" type="module" />
    </>
  );
}
