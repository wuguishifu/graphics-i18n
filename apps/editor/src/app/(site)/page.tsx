import { ArrowRight, Globe, Package, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { Code } from '@/components/site/docs';
import { buttonVariants } from '@/components/ui/button';

const packages = [
  {
    name: '@graphics-i18n/core',
    href: '/docs/core',
    icon: Package,
    description:
      'Platform-agnostic pipeline: container reading, manifest validation, locale negotiation, text fitting and the effective scene renderers consume.',
  },
  {
    name: '@graphics-i18n/react',
    href: '/docs/react',
    icon: Globe,
    description:
      'Web renderer producing a self-contained inline SVG that works in the browser and in server-rendered output.',
  },
  {
    name: '@graphics-i18n/react-native',
    href: '/docs/react-native',
    icon: Smartphone,
    description:
      'React Native renderer drawing with @shopify/react-native-skia, with platform-accurate text measurement.',
  },
];

const steps = [
  {
    title: 'Author',
    description:
      'Design a graphic once in the editor: images, shapes and text nodes with fitting rules, then add locale packs for each language.',
  },
  {
    title: 'Package',
    description:
      'Export a single .lpkg file (or pack a spec directory with the lpkg CLI). Strings, fonts and assets ship together, chunked per locale.',
  },
  {
    title: 'Render',
    description:
      'Drop <LocalizedGraphic /> into your app. The runtime negotiates the locale, applies overrides and fits text — no per-language image exports.',
  },
];

export default function Index() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight">graphics-i18n</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed">
        Localized graphics as data. Author a graphic once, ship it as a single{' '}
        <Code>.lpkg</Code> package, and render it in any language on the web or
        in React Native — with real text instead of baked-in pixels.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/editor" className={buttonVariants()}>
          Open the editor
          <ArrowRight />
        </Link>
        <Link
          href="/example"
          className={buttonVariants({ variant: 'outline' })}
        >
          See a live example
        </Link>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2">
              <div className="text-muted-foreground font-mono text-sm">
                {i + 1}
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Packages</h2>
        <div className="mt-6 grid gap-4">
          {packages.map((pkg) => (
            <Link
              key={pkg.name}
              href={pkg.href}
              className="group hover:bg-accent flex items-start gap-4 rounded-lg border p-5 transition-colors"
            >
              <pkg.icon className="text-muted-foreground mt-1 size-5 shrink-0" />
              <div>
                <h3 className="font-mono font-semibold group-hover:underline">
                  {pkg.name}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {pkg.description}
                </p>
              </div>
              <ArrowRight className="text-muted-foreground ml-auto mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          Why not just export images?
        </h2>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          Text baked into images has to be re-exported for every language, and
          translations rarely fit the original layout. An LPKG package keeps
          strings, fonts and artwork separate: text is fitted deterministically
          at render time (shrink, wrap or resize within authored bounds),
          right-to-left locales mirror automatically, and missing strings fall
          back gracefully with diagnostics instead of blank space. The full
          format and runtime behavior are specified in{' '}
          <a
            className="text-primary underline underline-offset-4"
            href="https://github.com/wuguishifu/graphics-i18n/blob/main/spec.md"
            target="_blank"
            rel="noreferrer"
          >
            spec.md
          </a>
          .
        </p>
      </section>
    </main>
  );
}
