# @wuguishifu/core

Platform-agnostic pipeline for **LPKG** localized graphics packages: container
reading (zip via fflate, plus `*.lpkg.json` debug bundles), manifest
validation, locale negotiation, patch/locale application, deterministic text
fitting, effective-scene building, caching and migration. No React, DOM or
native dependency — runs in Node, browsers, workers and SSR.

See `spec.md` at the repo root for the full format and runtime spec.
Renderers build on this package:

- `@wuguishifu/react-graphics-i18n` — web (SVG)
- `@wuguishifu/react-native-graphics-i18n` — React Native (Skia)

## Core API

```ts
import { loadLocalizedGraphic, validateLocalizedGraphicPackage } from '@wuguishifu/core';

const { manifest, effectiveScene, container } = await loadLocalizedGraphic(source, 'fr');
```

`effectiveScene` is the backend-agnostic draw list (`EffectiveNode[]` with
resolved text, bounds, matrices and z-order) that renderers consume.

Text fitting runs against a `TextMeasurer`; the built-in `approxTextMeasurer`
is deterministic and font-agnostic, and renderers can pass a platform-accurate
measurer via `LoadOptions.createMeasurer`.

## Authoring tools (Node only)

```ts
import { packLpkgFromFiles, packLpkgDir, validateLpkg } from '@wuguishifu/core/tools';
```

CLI (after build):

```sh
lpkg pack ./my-banner -o banner.lpkg   # zips a spec §3.2 directory, adds chunk hashes
lpkg validate banner.lpkg
```

`@wuguishifu/core/testing` exports the shared example-package fixtures used by
the lib test suites.

## Behavior notes

- **String fallback:** requested pack → fallback pack → node `fallbackText` →
  empty string, each miss recorded as a `STRING_MISSING` diagnostic in
  `effectiveScene.meta.diagnostics`.
- **Badge text** is literal unless prefixed with `@` (`"@promo.discount"`).
- **Override precedence** for text nodes: scene patch → node
  `localeOverrides[locale]` → locale pack `nodeOverrides` (last wins).
- **RTL:** direction comes from the locale pack (or locale heuristic); text
  nodes mirror alignment unless `rtlAware: false`.

### v1 limitations

- `fit.mode: 'scroll'` renders as clip; `resize-box` only grows height.
- Group `layout.justify` and `align: 'stretch'` are ignored; `clipPath` and
  `blendMode` are not yet applied.
- Path bounds are approximate (coordinate scan, curves overestimate).
