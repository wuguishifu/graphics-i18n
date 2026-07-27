import Link from 'next/link';
import {
  Code,
  CodeBlock,
  DocsList,
  DocsPage,
  DocsSection,
  InstallTabs,
  P,
} from '@/components/site/docs';

export const metadata = {
  title: '@graphics-i18n/core',
  description: 'Platform-agnostic pipeline for LPKG localized graphics',
};

export default function CoreDocs() {
  return (
    <DocsPage
      title="@graphics-i18n/core"
      description={
        <>
          Platform-agnostic pipeline for <strong>LPKG</strong> localized
          graphics packages: container reading (zip via fflate, plus{' '}
          <Code>*.lpkg.json</Code> debug bundles), manifest validation, locale
          negotiation, patch/locale application, deterministic text fitting,
          effective-scene building, caching and migration. No React, DOM or
          native dependency — runs in Node, browsers, workers and SSR.
        </>
      }
    >
      <DocsSection title="Installation">
        <InstallTabs packages="@graphics-i18n/core" />
        <P>
          If you are rendering with{' '}
          <Link className="text-primary underline underline-offset-4" href="/docs/react">
            @graphics-i18n/react
          </Link>{' '}
          or{' '}
          <Link
            className="text-primary underline underline-offset-4"
            href="/docs/react-native"
          >
            @graphics-i18n/react-native
          </Link>
          , core is already included as a dependency — install it directly only
          for server pipelines, tooling or custom renderers.
        </P>
      </DocsSection>

      <DocsSection title="Core API">
        <CodeBlock>{`
import {
  loadLocalizedGraphic,
  validateLocalizedGraphicPackage,
} from '@graphics-i18n/core';

const { manifest, effectiveScene, container } = await loadLocalizedGraphic(
  source,
  'fr',
);
`}</CodeBlock>
        <P>
          <Code>effectiveScene</Code> is the backend-agnostic draw list (
          <Code>EffectiveNode[]</Code> with resolved text, bounds, matrices and
          z-order) that renderers consume.
        </P>
        <P>
          Text fitting runs against a <Code>TextMeasurer</Code>; the built-in{' '}
          <Code>approxTextMeasurer</Code> is deterministic and font-agnostic,
          and renderers can pass a platform-accurate measurer via{' '}
          <Code>LoadOptions.createMeasurer</Code>.
        </P>
      </DocsSection>

      <DocsSection title="Authoring tools (Node only)">
        <CodeBlock>{`
import {
  packLpkgFromFiles,
  packLpkgDir,
  validateLpkg,
} from '@graphics-i18n/core/tools';
`}</CodeBlock>
        <P>The same operations are available on the command line:</P>
        <CodeBlock>{`
lpkg pack ./my-banner -o banner.lpkg   # zips a spec §3.2 directory, adds chunk hashes
lpkg validate banner.lpkg
`}</CodeBlock>
        <P>
          <Code>@graphics-i18n/core/testing</Code> exports the shared
          example-package fixtures used by the lib test suites.
        </P>
      </DocsSection>

      <DocsSection title="Behavior notes">
        <DocsList>
          <li>
            <strong>String fallback:</strong> requested pack → fallback pack →
            node <Code>fallbackText</Code> → empty string, each miss recorded as
            a <Code>STRING_MISSING</Code> diagnostic in{' '}
            <Code>effectiveScene.meta.diagnostics</Code>.
          </li>
          <li>
            <strong>Badge text</strong> is literal unless prefixed with{' '}
            <Code>@</Code> (<Code>&quot;@promo.discount&quot;</Code>).
          </li>
          <li>
            <strong>Override precedence</strong> for text nodes: scene patch →
            node <Code>localeOverrides[locale]</Code> → locale pack{' '}
            <Code>nodeOverrides</Code> (last wins).
          </li>
          <li>
            <strong>RTL:</strong> direction comes from the locale pack (or
            locale heuristic); text nodes mirror alignment unless{' '}
            <Code>rtlAware: false</Code>.
          </li>
        </DocsList>
      </DocsSection>

      <DocsSection title="v1 limitations">
        <DocsList>
          <li>
            <Code>fit.mode: &apos;scroll&apos;</Code> renders as clip;{' '}
            <Code>resize-box</Code> only grows height.
          </li>
          <li>
            Group <Code>layout.justify</Code> and{' '}
            <Code>align: &apos;stretch&apos;</Code> are ignored;{' '}
            <Code>clipPath</Code> and <Code>blendMode</Code> are not yet
            applied.
          </li>
          <li>
            Path bounds are approximate (coordinate scan, curves overestimate).
          </li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
