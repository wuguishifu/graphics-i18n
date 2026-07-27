# @graphics-i18n/react

Web renderer for LPKG localized graphics (`@graphics-i18n/core`), producing a
self-contained inline SVG — assets and fonts are inlined as data URIs, so the
same markup works in the browser and in server-rendered output.

```tsx
import { LocalizedGraphic } from '@graphics-i18n/react';

<LocalizedGraphic source="/graphics/banner.lpkg" locale="fr" width={640} />;
```

In the browser, embedded package fonts are registered through the FontFace
API and text fitting is measured with the real canvas metrics; outside the
DOM the deterministic approximate measurer is used.

## SSR / static rendering

The pieces are exported separately so a server can render without the hook:

```tsx
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
```

Only the requested locale's chunks are decoded, and only assets/fonts
referenced by visible nodes are inlined.

## Web-specific notes

- Scaling is done with the SVG `viewBox`, so `width`/`height` never distort
  layout math.
- Underline/strikethrough and `letterSpacing` are supported via SVG text
  attributes.
- `fit: 'none'` on images approximates to `contain` (`preserveAspectRatio`
  has no direct equivalent).
- The `debug` prop draws node bounds and lists locale/patch/diagnostic info.
