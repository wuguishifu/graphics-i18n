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
  title: '@graphics-i18n/react-native',
  description: 'React Native renderer for LPKG localized graphics',
};

export default function ReactNativeDocs() {
  return (
    <DocsPage
      title="@graphics-i18n/react-native"
      description={
        <>
          React Native renderer for LPKG localized graphics (
          <Code>@graphics-i18n/core</Code>), drawing via{' '}
          <Code>@shopify/react-native-skia</Code>. The core pipeline API (
          <Code>loadLocalizedGraphic</Code>, types, …) is re-exported from this
          package for convenience.
        </>
      }
    >
      <DocsSection title="Installation">
        <InstallTabs packages="@graphics-i18n/react-native @shopify/react-native-skia" />
        <P>
          Peer dependencies: <Code>react &gt;= 18</Code>,{' '}
          <Code>react-native &gt;= 0.73</Code> and{' '}
          <Code>@shopify/react-native-skia &gt;= 1.0.0</Code>.
        </P>
        <P>
          Metro must treat packages as assets — add <Code>lpkg</Code> to{' '}
          <Code>resolver.assetExts</Code> in your <Code>metro.config.js</Code>:
        </P>
        <CodeBlock>{`
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('lpkg');
module.exports = config;
`}</CodeBlock>
      </DocsSection>

      <DocsSection title="Usage">
        <CodeBlock>{`
import { LocalizedGraphic } from '@graphics-i18n/react-native';

<LocalizedGraphic source={require('./banner.lpkg')} locale="fr" width={360} />;
`}</CodeBlock>
        <P>
          See the{' '}
          <Link
            className="text-primary underline underline-offset-4"
            href="/docs/core"
          >
            core documentation
          </Link>{' '}
          for format and behavior details, and{' '}
          <Link
            className="text-primary underline underline-offset-4"
            href="/docs/react"
          >
            @graphics-i18n/react
          </Link>{' '}
          for the web renderer. A working demo lives in{' '}
          <Code>apps/example-react-native</Code> in the repo.
        </P>
      </DocsSection>

      <DocsSection title="React Native-specific notes">
        <DocsList>
          <li>
            Text is measured with Skia fonts (package-embedded typefaces first,
            then system font matching; unknown families fall back to the
            platform default so text always renders).
          </li>
          <li>
            Images/SVGs are decoded lazily for visible nodes only and cached by
            asset id + hash; fonts are decoded once per package.
          </li>
          <li>
            The <Code>debug</Code> prop draws node bounds on the canvas and
            overlays locale/patch/diagnostic info.
          </li>
          <li>
            Underline/strikethrough text decorations are not drawn (Skia{' '}
            <Code>&lt;Text&gt;</Code> limitation in this renderer).
          </li>
        </DocsList>
      </DocsSection>
    </DocsPage>
  );
}
