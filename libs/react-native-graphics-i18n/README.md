# @wuguishifu/react-native-graphics-i18n

React Native renderer for LPKG localized graphics (`@wuguishifu/core`),
drawing via `@shopify/react-native-skia`.

```tsx
import { LocalizedGraphic } from '@wuguishifu/react-native-graphics-i18n';

<LocalizedGraphic source={require('./banner.lpkg')} locale="fr" width={360} />;
```

The core pipeline API (`loadLocalizedGraphic`, types, …) is re-exported from
this package for convenience; see the core README for format and behavior
documentation, and `@wuguishifu/react-graphics-i18n` for the web renderer. A
working demo lives in `apps/example-react-native` (package source in
`assets/graphics/summer-promo/`, rebuilt with
`nx run example-react-native:build-graphics`).

Requirements in the consuming app:

- peer deps: `react`, `react-native`, `@shopify/react-native-skia`
- Metro must treat packages as assets: add `'lpkg'` to `resolver.assetExts`

## RN-specific notes

- Text is measured with Skia fonts (package-embedded typefaces first, then
  system font matching; unknown families fall back to the platform default so
  text always renders).
- Images/SVGs are decoded lazily for visible nodes only and cached by asset
  id + hash; fonts are decoded once per package.
- The `debug` prop draws node bounds on the canvas and overlays
  locale/patch/diagnostic info.
- Underline/strikethrough text decorations are not drawn (Skia `<Text>`
  limitation in this renderer).
