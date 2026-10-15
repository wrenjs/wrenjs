import Link from "@wren-js/core/link";
import { WrenHero } from "#/components/brand/large-logo";
import { CTA } from "#/components/cta";
import { Em } from "#/components/em";
import { Icon } from "#/components/icon";
import { PackageManagerSelect } from "#/components/package-selector";
import { BentoFamiliarFeatures } from "./_components/bento-familiar-features";
import { BentoFamiliarHosts } from "./_components/bento-familiar-hosts";
import { BentoFamiliarTools } from "./_components/bento-familiar-tools";
import { BentoFamiliarUI } from "./_components/bento-familiar-ui";
import { BentoLightBundle } from "./_components/bento-light-bundle";
import { BentoLightSSR } from "./_components/bento-light-ssr";

export default function HomePage() {
  return (
    <>
      <header class=":uno: overflow-x-clip overflow-y-visible min-h-[500px] h-[calc(100dvh-42px)] relative mx-auto flex max-w-[768px] snap-start flex-col items-center justify-center px-4 pt-[7.5%] text-gray-800">
        <div class=":uno: relative">
          <h1 class=":uno: text-18 font-accent leading-none tracking-tight">wren</h1>
          <h2 class=":uno: text-4">
            <Icon class=":uno: size-3" name="i-lucide:pencil-sparkles" /> <Em>Familiar</Em>,{" "}
            <Icon class=":uno: size-3" name="i-lucide:feather" /> <Em>feather-light</Em>{" "}
            meta-framework
          </h2>
          <div class=":uno: relative mt-4 flex md:flex-row flex-col gap-2">
            <div class="md:contents hidden">
              <PackageManagerSelect />
            </div>
            <CTA href="/docs">
              Get Started
              <Icon class=":uno: ml-2" name="i-lucide:arrow-right" />
            </CTA>
          </div>
          <div
            class=":uno: absolute opacity-100 bottom-[45%] left-2/5 -rotate-3 w-[360px] max-w-full"
            inert
          >
            <WrenHero />
          </div>
        </div>
      </header>
      <main class=":uno: mx-auto flex max-w-[1024px] flex-col items-center justify-center gap-16 px-4 md:px-12 py-12 text-gray-800">
        <section class=":uno: flex flex-col gap-8">
          <div class=":uno: space-y-1">
            <h2 class=":uno: text-15 font-accent leading-none">Familiar</h2>
            <div class=":uno: text-gray-700">
              <p>Integrates well with libraries you love.</p>
              <p>Intuitive features and API, and a few new ones to explore.</p>
            </div>
          </div>
          <div class=":uno: flex md:flex-row flex-col gap-8">
            <div class=":uno: flex md:flex-col flex-wrap gap-5 md:gap-8">
              <BentoFamiliarHosts />
              <BentoFamiliarTools />
              <BentoFamiliarUI />
            </div>
            <div class=":uno: flex">
              <BentoFamiliarFeatures />
            </div>
          </div>
        </section>

        <section class=":uno: flex flex-col gap-8">
          <div class=":uno: space-y-1">
            <h2 class=":uno: text-15 font-accent leading-none">Feather-light</h2>
            <div class=":uno: text-gray-700">
              <p>
                Built on{" "}
                <Link
                  className="text-blue! underline"
                  href="https://vitejs.dev/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Icon class=":uno: h-[1ch]" name="i-simple-icons:vite" /> vite
                </Link>{" "}
                for swift developments and builds.
              </p>
              <p>Configurable route-based caching. Competitive SSR performance.</p>
            </div>
          </div>
          <div class=":uno: mt-2 flex lg:flex-row flex-col gap-4">
            <BentoLightSSR />
            <BentoLightBundle />
          </div>
        </section>
      </main>
    </>
  );
}
