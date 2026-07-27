# @root/react-native-graphics-i18n

Localized graphics renderer for React Native. Loads `.lpkg` packages — a zip
container holding one shared scene graph, per-locale strings, optional layout
patches, and shared assets/fonts — and renders a single locale via Skia.

See `spec.md` at the repo root for the full format and runtime spec. A
working demo lives in `apps/example-react-native` (package source in
`assets/graphics/summer-promo/`, rebuilt with `nx run
example-react-native:build-graphics`).

## Usage

```tsx
import { LocalizedGraphic } from '@root/react-native-graphics-i18n';

<LocalizedGraphic source={require('./banner.lpkg')} locale="fr" width={360} />;
```

Requirements in the consuming app:

- peer deps: `react`, `react-native`, `@shopify/react-native-skia`
- Metro must treat packages as assets: add `'lpkg'` to `resolver.assetExts`

Imperative API:

```ts
import {
  loadLocalizedGraphic,
  prefetchLocalizedGraphic,
  validateLocalizedGraphicPackage,
} from '@root/react-native-graphics-i18n';

const { manifest, effectiveScene } = await loadLocalizedGraphic(source, 'fr');
```

The core pipeline (container reading, locale negotiation, patching, text
fitting, effective-scene building) has no React/RN dependency and runs in
Node — the same package can be resolved server-side for SSR. In non-RN
environments import from the core entry, which excludes the renderer:

```ts
import { loadLocalizedGraphic } from '@root/react-native-graphics-i18n/core';
```

## Authoring tools (Node only)

```ts
import { packLpkgFromFiles, packLpkgDir, validateLpkg } from '@root/react-native-graphics-i18n/tools';
```

CLI (after build):

```sh
lpkg pack ./my-banner -o banner.lpkg   # zips a spec §3.2 directory, adds chunk hashes
lpkg validate banner.lpkg
```

A `*.lpkg.json` debug bundle (flat JSON map of chunk path → content, binary as
base64) is also accepted by the runtime; build one with `buildJsonBundle`.

## Behavior notes

- **String fallback:** requested pack → fallback pack → node `fallbackText` →
  empty string, each miss recorded as a `STRING_MISSING` diagnostic
  (`effectiveScene.meta.diagnostics`, shown by the `debug` prop overlay).
- **Badge text** is literal unless prefixed with `@` (`"@promo.discount"`).
- **Override precedence** for text nodes: scene patch → node
  `localeOverrides[locale]` → locale pack `nodeOverrides` (last wins).
- **RTL:** direction comes from the locale pack (or locale heuristic);
  text nodes mirror alignment unless `rtlAware: false`.
- **Text measurement** uses embedded package fonts through Skia at runtime and
  a deterministic approximate measurer in Node/tests.

### v1 limitations

- `fit.mode: 'scroll'` renders as clip; `resize-box` only grows height.
- Group `layout.justify` and `align: 'stretch'` are ignored (needs container
  sizing); `clipPath` and `blendMode` are not yet applied.
- Underline/strikethrough text decorations are not drawn.
- Path bounds are approximate (coordinate scan, curves overestimate).
