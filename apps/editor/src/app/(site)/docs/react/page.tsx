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
  title: '@graphics-i18n/react',
  description: 'Web renderer for LPKG localized graphics',
};

export default function ReactDocs() {
  return (
    <DocsPage
      title="@graphics-i18n/react"
      description={
        <>
          Web renderer for LPKG localized graphics (
          <Code>@graphics-i18n/core</Code>), producing a self-contained inline
          SVG — assets and fonts are inlined as data URIs, so the same markup
          works in the browser and in server-rendered output.
        </>
      }
    >
      <DocsSection title="Installation">
        <InstallTabs packages="@graphics-i18n/react" />
        <P>
          <Code>react &gt;= 18</Code> is a peer dependency;{' '}
          <Code>@graphics-i18n/core</Code> comes with the package.
        </P>
      </DocsSection>

      <DocsSection title="Usage">
        <CodeBlock>{`
import { LocalizedGraphic } from '@graphics-i18n/react';

<LocalizedGraphic source="/graphics/banner.lpkg" locale="fr" width={640} />;
`}</CodeBlock>
        <P>
          In the browser, embedded package fonts are registered through the
          FontFace API and text fitting is measured with the real canvas
          metrics; outside the DOM the deterministic approximate measurer is
          used.
        </P>
      </DocsSection>

      <DocsSection title="SSR / static rendering">
        <P>
          The pieces are exported separately so a server can render without the
          hook:
        </P>
        <CodeBlock>{`
import { loadLocalizedGraphic } from '@graphics-i18n/core';
import { SvgGraphic, buildSvgResources } from '@graphics-i18n/react';
import { renderToStaticMarkup } from 'react-dom/server';

const result = await loadLocalizedGraphic(source, locale);
const resources = buildSvgResources(
  result.container,
  result.manifest,
  result.effectiveScene,
);
const svg = renderToStaticMarkup(
  <SvgGraphic
    scene={result.effectiveScene}
    resources={resources}
    width={640}
  />,
);
`}</CodeBlock>
        <P>
          Only the requested locale&apos;s chunks are decoded, and only
          assets/fonts referenced by visible nodes are inlined.
        </P>
      </DocsSection>

      <DocsSection title="Web-specific notes">
        <DocsList>
          <li>
            Scaling is done with the SVG <Code>viewBox</Code>, so{' '}
            <Code>width</Code>/<Code>height</Code> never distort layout math.
          </li>
          <li>
            Underline/strikethrough and <Code>letterSpacing</Code> are supported
            via SVG text attributes.
          </li>
          <li>
            <Code>fit: &apos;none&apos;</Code> on images approximates to{' '}
            <Code>contain</Code> (<Code>preserveAspectRatio</Code> has no direct
            equivalent).
          </li>
          <li>
            The <Code>debug</Code> prop draws node bounds and lists
            locale/patch/diagnostic info.
          </li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
