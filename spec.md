# Localized Graphic Package + React Native Renderer Spec

## 1) Overview

This spec defines:

1. A **portable package container** for localized graphics.
2. A **React Native renderer** that loads the package, selects a locale, resolves assets and localized text, and renders the graphic efficiently.

The design goal is to let app code treat a localized graphic like a single asset:

```tsx
<LocalizedGraphic source={require('./banner.lpkg')} locale="fr" />
```

The package must support:

- one shared visual scene
- locale-specific text
- optional locale-specific layout patches
- shared assets
- lazy loading
- forward-compatible schema evolution
- efficient server-side rendering decisions on web, even though this spec is focused on React Native

---

## 2) Core Concepts

### 2.1 Package

A package is a single distributable file, called an **LPKG** (`.lpkg`), that contains:

- a manifest
- a scene graph
- shared assets
- locale packs
- optional locale patches
- optional metadata and hashes

The package is optimized for partial loading. The renderer should not need to decode all locales to render one locale.

### 2.2 Scene Graph

The scene graph is the locale-agnostic base structure of the graphic. It describes:

- canvas size
- layers/nodes
- node geometry
- style
- z-order
- references to shared assets
- text bindings to localization keys

### 2.3 Locale Pack

A locale pack provides:

- localized strings
- optional locale-specific node overrides
- optional locale-specific asset overrides
- optional locale-specific font overrides

### 2.4 Patch

A patch is a small object that overrides parts of the base scene for a locale. A patch should be applied after the base scene is loaded and before layout/render.

---

## 3) Package Container Spec

## 3.1 File Extension

Use:

- `*.lpkg` for compiled runtime packages
- `*.lpkg.json` optionally for debug / uncompressed development builds if desired

The runtime must accept a single file path or require-able asset reference.

## 3.2 Container Format

### Recommended v1 container

Use a **zip-like archive container** with a top-level index.

Why this format:

- simple to generate
- simple to inspect in dev tools
- easy to support in native and JS runtimes
- enough for partial loading if chunk paths are known

The container file is logically a zip archive with the following root structure:

```text
manifest.json
scene.json
assets/
  ...
locales/
  en.json
  fr.json
  ja.json
patches/
  fr.json
  ja.json
fonts/
  ...
```

The runtime should treat the archive as opaque and access files by path.

---

## 3.3 Required Files

### `manifest.json`

Required. Contains package metadata, chunk references, checksums, and supported locales.

### `scene.json`

Required. Contains the base scene graph.

### `locales/<locale>.json`

Optional per locale. Contains translations and locale-level metadata.

### `patches/<locale>.json`

Optional per locale. Contains structural layout overrides.

### `assets/*`

Optional shared assets referenced by the scene.

### `fonts/*`

Optional embedded font files if the package needs custom typography.

---

## 3.4 Manifest Schema

### `manifest.json` shape

```ts
type PackageManifest = {
  schemaVersion: string; // e.g. "1.0.0"
  packageId: string; // stable UUID or slug
  packageVersion: number; // package build/version counter

  name?: string;
  description?: string;

  canvas: {
    width: number;
    height: number;
    background?: string; // CSS-like hex or rgba string
    pixelRatioHint?: number; // optional render hint
  };

  render: {
    engine: 'skia' | 'svg' | 'auto';
    defaultLocale?: string;
    fallbackLocale: string;
    textDirection?: 'ltr' | 'rtl';
  };

  chunks: {
    scene: string; // usually "scene.json"
    locales: Record<string, string>; // locale -> locale file path
    patches?: Record<string, string>; // locale -> patch file path
    assets?: Record<string, string>; // asset id -> path
    fonts?: Record<string, string>; // font id -> path
  };

  locales: Array<{
    locale: string; // "en", "fr", "ja", "pt-BR"
    label?: string;
    direction?: 'ltr' | 'rtl';
    patch?: boolean; // true if patch exists
    strings?: boolean; // true if locale file exists
  }>;

  assets: Record<
    string,
    {
      path: string;
      type: 'image' | 'svg' | 'font' | 'video' | 'json' | 'other';
      sha256?: string;
      width?: number;
      height?: number;
      mimeType?: string;
    }
  >;

  fonts?: Record<
    string,
    {
      path: string;
      family: string;
      weight?: number;
      style?: 'normal' | 'italic';
      sha256?: string;
    }
  >;

  integrity?: {
    sha256?: string; // whole-package hash if available
    chunkHashes?: Record<string, string>; // relative path -> sha256
  };

  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
  authoringTool?: {
    name: string;
    version: string;
  };
};
```

### Manifest rules

- `schemaVersion` is the schema version for the package format, not the editor project.
- `fallbackLocale` must always exist and must have a locale pack.
- `render.defaultLocale` is the locale shown if no locale is passed.
- `render.fallbackLocale` is the locale used when a string is missing.
- `chunks.locales` paths must be unique and present if `locales[].strings` is true.
- `chunks.patches` is optional.
- `chunks.assets` should index assets by stable asset ID, not by filename.
- `chunks.fonts` should index font IDs similarly.

---

## 3.5 Scene Schema

### `scene.json` shape

```ts
type Scene = {
  sceneVersion: string; // e.g. "1.0.0"
  root: Node[];
};
```

### Node model

Nodes form a tree. Every node must have a stable `id`.

```ts
type Node =
  | GroupNode
  | RectNode
  | ImageNode
  | SvgNode
  | TextNode
  | PathNode
  | LineNode
  | BadgeNode;
```

### Common node fields

```ts
type BaseNode = {
  id: string;
  type: string;
  name?: string;
  visible?: boolean;
  opacity?: number;
  transform?: Transform2D;
  blendMode?: string;
  clipPath?: string; // node id reference
  metadata?: Record<string, unknown>;
};
```

### Transform

Use a 2D transform that is explicit and serializable.

```ts
type Transform2D = {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number; // degrees
  skewX?: number;
  skewY?: number;
  anchorX?: number; // 0..1
  anchorY?: number; // 0..1
};
```

### Group node

```ts
type GroupNode = BaseNode & {
  type: 'group';
  children: Node[];
  layout?: {
    mode?: 'free' | 'vertical' | 'horizontal';
    gap?: number;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'space-between';
  };
};
```

### Rect node

```ts
type RectNode = BaseNode & {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  fill?: string;
  stroke?: {
    color: string;
    width: number;
  };
};
```

### Image node

```ts
type ImageNode = BaseNode & {
  type: 'image';
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit?: 'contain' | 'cover' | 'fill' | 'none';
};
```

### SVG node

```ts
type SvgNode = BaseNode & {
  type: 'svg';
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
```

### Text node

Text nodes are the main localization target.

```ts
type TextNode = BaseNode & {
  type: 'text';
  bind: string; // localization key
  fallbackText?: string; // optional default language text
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: TextStyle;
  fit?: TextFit;
  wrap?: {
    mode: 'word' | 'char' | 'none';
    maxLines?: number;
  };
  rtlAware?: boolean;
  localeOverrides?: Record<string, Partial<TextNodeOverride>>;
};
```

### Text style

```ts
type TextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number | 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number;
  letterSpacing?: number;
  color: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  underline?: boolean;
  strike?: boolean;
  uppercase?: boolean;
};
```

### Text fit

```ts
type TextFit = {
  mode: 'none' | 'shrink' | 'resize-box' | 'ellipsis' | 'scroll';
  minFontSize?: number;
  maxFontSize?: number;
  step?: number;
  overflow?: 'clip' | 'ellipsis';
};
```

### Text overrides

```ts
type TextNodeOverride = {
  box?: Partial<TextNode['box']>;
  style?: Partial<TextStyle>;
  fit?: Partial<TextFit>;
  wrap?: Partial<NonNullable<TextNode['wrap']>>;
};
```

### Path node

For vector decorations.

```ts
type PathNode = BaseNode & {
  type: 'path';
  d: string;
  fill?: string;
  stroke?: {
    color: string;
    width: number;
  };
};
```

### Line node

```ts
type LineNode = BaseNode & {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: {
    color: string;
    width: number;
  };
};
```

### Badge node

A convenience node type for common infographic labels.

```ts
type BadgeNode = BaseNode & {
  type: 'badge';
  text: string; // literal text or localization key if prefixed
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: TextStyle;
  background: {
    fill: string;
    radius: number;
  };
};
```

---

## 3.6 Locale Pack Schema

### `locales/<locale>.json` shape

```ts
type LocalePack = {
  locale: string;
  direction?: 'ltr' | 'rtl';
  strings: Record<string, string>;
  nodeOverrides?: Record<
    string,
    {
      box?: Partial<{ x: number; y: number; width: number; height: number }>;
      style?: Partial<TextStyle>;
      fit?: Partial<TextFit>;
      wrap?: Partial<{ mode: 'word' | 'char' | 'none'; maxLines?: number }>;
    }
  >;
  assetOverrides?: Record<string, string>; // assetId -> alt assetId
  fontOverrides?: Record<string, string>; // font family -> fontId
};
```

### Locale pack rules

- `strings` must be key/value pairs.
- Missing strings fall back to `fallbackLocale`.
- `nodeOverrides` are optional and only used when needed.
- `assetOverrides` allow locale-specific artwork, such as different screenshots or symbols.
- `fontOverrides` let a locale swap fonts when required.

---

## 3.7 Patch Schema

Patches are partial changes to scene nodes.

### `patches/<locale>.json` shape

```ts
type LocalePatch = {
  nodes: Record<
    string,
    {
      visible?: boolean;
      transform?: Partial<Transform2D>;
      box?: Partial<{ x: number; y: number; width: number; height: number }>;
      style?: Partial<TextStyle>;
      fit?: Partial<TextFit>;
    }
  >;
};
```

Rules:

- Patch keys reference node IDs.
- Patches must only override existing nodes.
- Patches may not add new node IDs in v1.
- Patches are applied after the base scene is loaded and before layout.

---

## 4) Runtime Behavior Spec

## 4.1 React Native API

The public component should look like this:

```tsx
type LocalizedGraphicProps = {
  source: number | string | { uri: string };
  locale: string;
  width?: number;
  height?: number;
  style?: any;
  fallbackLocale?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  debug?: boolean;
};

function LocalizedGraphic(props: LocalizedGraphicProps): React.ReactElement;
```

### Behavior

- `source` points to the `.lpkg`.
- `locale` selects the locale pack.
- `fallbackLocale` overrides the package fallback at runtime if provided.
- `width` and `height` allow the caller to size the graphic.
- The component should load and render asynchronously.
- The component should surface loading and error states if desired.

---

## 4.2 Renderer Pipeline

The renderer should follow these stages:

### Stage 1: Resolve source

- Accept a local bundle reference or URI.
- Open the package.
- Read and validate `manifest.json`.

### Stage 2: Determine locale

- Use the requested `locale`.
- If that locale is missing, fall back to `fallbackLocale`.
- If both are missing, fail with a structured error.

### Stage 3: Load minimal required chunks

- Always load `scene.json`.
- Load only the requested locale pack.
- Load only needed patches for that locale.
- Load assets referenced by visible nodes.
- Load fonts referenced by visible text nodes.

### Stage 4: Build an effective scene

- Parse the scene tree.
- Apply locale patch.
- Resolve all localization keys.
- Apply font overrides.
- Apply node overrides.
- Run layout and fit calculations.

### Stage 5: Render

- Render via the selected backend.
- Emit a raster image or native view tree, depending on the backend.

### Stage 6: Cache

- Cache the parsed manifest.
- Cache the scene AST.
- Cache locale packs by locale.
- Cache decoded assets by asset ID and hash.

---

## 4.3 Rendering Backend

For React Native, use a scene renderer built on a native drawing backend.

Recommended target: **Skia-based renderer**.

The renderer should not directly depend on the editor model. It should consume an internal **effective scene** structure after resolution and layout.

### Internal effective scene structure

```ts
type EffectiveScene = {
  canvas: {
    width: number;
    height: number;
    background?: string;
  };
  nodes: EffectiveNode[];
};

type EffectiveNode = {
  id: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  visible: boolean;
  zIndex: number;
  draw: DrawInstruction;
};
```

`DrawInstruction` should be backend-specific and should not include localization keys anymore.

---

## 4.4 Text Layout Rules

Text layout is the most important part of the renderer.

### Requirements

1. Measure the localized text after substitution.
2. Determine whether it fits in the assigned box.
3. Apply fit mode:

   - `none`: render at style size, clip if necessary
   - `shrink`: reduce font size until it fits or min font size reached
   - `resize-box`: expand box if layout rules permit
   - `ellipsis`: truncate with ellipsis
   - `scroll`: only if supported by the embedding surface, otherwise reject or clip

4. Respect line height, wrapping, alignment, and direction.
5. If locale is RTL, switch layout direction and text alignment defaults as needed.
6. If locale-specific overrides exist, apply them before measuring.

### Fitting algorithm

Pseudo-flow:

1. Set `fontSize = style.fontSize`.
2. Resolve text string for the key in the current locale.
3. Measure text with width constraint.
4. If it fits, render.
5. If not and mode is `shrink`, decrement by `step` until fit or `minFontSize`.
6. If still not fit, apply overflow policy.
7. If mode is `resize-box`, optionally expand width or height if the node permits it.
8. Return final computed bounds.

### Determinism

Given the same package, locale, and renderer version, layout should be deterministic.

---

## 4.5 Asset Resolution Rules

### Asset IDs

Every asset in the package must have a stable `assetId`.

### Resolution order

When a node references an asset:

1. Check locale asset override for the current locale.
2. Fall back to shared asset ID.
3. If missing, emit a structured render error.

### Asset cache keys

Cache by:

- asset ID
- asset hash, if present
- requested decode size, if resizing is used

### Image handling

Images should be decoded only when needed. Do not pre-decode every asset on load.

### Fonts

Fonts should be loaded lazily and cached per family/weight/style.

---

## 4.6 Error Handling

The renderer must return structured errors.

### Error types

```ts
type GraphicError =
  | { code: 'PACKAGE_NOT_FOUND'; message: string }
  | { code: 'INVALID_PACKAGE'; message: string; details?: unknown }
  | { code: 'SCENE_PARSE_FAILED'; message: string; details?: unknown }
  | { code: 'LOCALE_MISSING'; message: string; locale: string }
  | { code: 'STRING_MISSING'; message: string; key: string; locale: string }
  | { code: 'ASSET_MISSING'; message: string; assetId: string }
  | { code: 'FONT_MISSING'; message: string; fontId: string }
  | { code: 'TEXT_LAYOUT_FAILED'; message: string; nodeId: string }
  | { code: 'RENDER_BACKEND_FAILED'; message: string; details?: unknown };
```

### Fallback behavior

- Missing string: use fallback locale string.
- Missing locale pack: use fallback locale pack.
- Missing patch: ignore patch.
- Missing asset or font: fail rendering for that node and surface an error.
- Invalid package: fail entire render.

---

## 5) React Native Implementation Architecture

## 5.1 Module structure

Recommended internal modules:

```text
src/
  package/
    openPackage.ts
    validateManifest.ts
    readChunk.ts
    resolveLocale.ts
  scene/
    parseScene.ts
    applyPatch.ts
    applyLocale.ts
    normalizeScene.ts
  layout/
    measureText.ts
    fitText.ts
    resolveDirection.ts
  assets/
    assetCache.ts
    loadImage.ts
    loadFont.ts
  renderer/
    EffectiveScene.ts
    renderSkia.ts
    drawNode.ts
  component/
    LocalizedGraphic.tsx
    useLocalizedGraphic.ts
```

## 5.2 Public library surface

Minimum public API:

```ts
type LoadPackageResult = {
  manifest: PackageManifest;
  scene: Scene;
  localePack: LocalePack;
  effectiveScene: EffectiveScene;
};

function loadLocalizedGraphic(
  source: string | number | { uri: string },
  locale: string,
  fallbackLocale?: string,
): Promise<LoadPackageResult>;

function renderLocalizedGraphic(
  source: string | number | { uri: string },
  locale: string,
  options?: RenderOptions,
): React.ReactElement;
```

Optional but useful:

```ts
function prefetchLocalizedGraphic(
  source: string | number | { uri: string },
  locale: string,
): Promise<void>;
function validateLocalizedGraphicPackage(
  source: string | number | { uri: string },
): Promise<PackageManifest>;
```

---

## 5.3 React component behavior

### Loading

`LocalizedGraphic` should:

- start in loading state
- resolve package data asynchronously
- render once the effective scene is ready

### Memoization

Memoize by:

- package identity
- locale
- fallback locale
- explicit width/height
- package hash if available

### Re-render policy

Re-render only when locale or package identity changes unless layout props change.

### Layout sizing

If width/height are not supplied:

- use package canvas size as default intrinsic size
- allow the container to scale the render output

---

## 5.4 Caching Strategy

Use three levels of cache:

### 1. Package cache

Cache package manifest and scene AST by package hash.

### 2. Locale cache

Cache locale packs per locale and package hash.

### 3. Asset cache

Cache decoded images/fonts by asset hash and requested decode parameters.

Rules:

- Do not keep every locale pack in memory forever.
- Evict least recently used locale packs first.
- Keep shared assets longer if memory allows.
- If the app navigates away, allow garbage collection of unused rendered trees.

---

## 5.5 SSR-friendly considerations

Even though this spec focuses on RN, the format should remain friendly for server rendering.

Design choices that help:

- locale packs are separate files
- the renderer can load only one locale
- the scene graph is deterministic
- text bindings are explicit
- layout data is serializable

That means a web renderer can use the same package and resolve only the server-known locale.

---

## 6) Versioning and Compatibility

## 6.1 Package schema version

`manifest.schemaVersion` controls container compatibility.

## 6.2 Scene schema version

`scene.sceneVersion` controls node compatibility.

## 6.3 Backward compatibility rules

- Minor version changes must be backward compatible when possible.
- New optional fields may be added without breaking older renderers.
- Breaking changes require a major version bump.
- The renderer should reject unsupported major versions with a clear error.

## 6.4 Migration strategy

Ship a migration layer:

```ts
migratePackage(manifest, scene): { manifest: PackageManifest; scene: Scene };
```

Migrations may:

- rename node fields
- split/merge node types
- rewrite text fit rules
- update asset references

The renderer should be able to consume older packages by upgrading them in memory if possible.

---

## 7) Example Package

### `manifest.json`

```json
{
  "schemaVersion": "1.0.0",
  "packageId": "summer-promo-banner",
  "packageVersion": 12,
  "canvas": {
    "width": 1200,
    "height": 630,
    "background": "#ffffff"
  },
  "render": {
    "engine": "skia",
    "defaultLocale": "en",
    "fallbackLocale": "en",
    "textDirection": "ltr"
  },
  "chunks": {
    "scene": "scene.json",
    "locales": {
      "en": "locales/en.json",
      "fr": "locales/fr.json",
      "ja": "locales/ja.json"
    },
    "patches": {
      "fr": "patches/fr.json",
      "ja": "patches/ja.json"
    },
    "assets": {
      "bg": "assets/bg.webp",
      "logo": "assets/logo.svg"
    },
    "fonts": {
      "inter-regular": "fonts/Inter-Regular.ttf",
      "inter-bold": "fonts/Inter-Bold.ttf"
    }
  },
  "locales": [
    { "locale": "en", "label": "English", "strings": true },
    { "locale": "fr", "label": "Français", "strings": true, "patch": true },
    { "locale": "ja", "label": "日本語", "strings": true, "patch": true }
  ],
  "assets": {
    "bg": { "path": "assets/bg.webp", "type": "image" },
    "logo": { "path": "assets/logo.svg", "type": "svg" }
  },
  "fonts": {
    "inter-regular": {
      "path": "fonts/Inter-Regular.ttf",
      "family": "Inter",
      "weight": 400
    },
    "inter-bold": {
      "path": "fonts/Inter-Bold.ttf",
      "family": "Inter",
      "weight": 700
    }
  }
}
```

### `scene.json`

```json
{
  "sceneVersion": "1.0.0",
  "root": [
    {
      "id": "background",
      "type": "image",
      "assetId": "bg",
      "x": 0,
      "y": 0,
      "width": 1200,
      "height": 630,
      "fit": "cover"
    },
    {
      "id": "title",
      "type": "text",
      "bind": "promo.title",
      "fallbackText": "Summer Sale",
      "box": { "x": 72, "y": 72, "width": 540, "height": 140 },
      "style": {
        "fontFamily": "Inter",
        "fontSize": 64,
        "fontWeight": 700,
        "lineHeight": 1.05,
        "color": "#111111",
        "align": "left",
        "valign": "top"
      },
      "fit": {
        "mode": "shrink",
        "minFontSize": 40,
        "overflow": "ellipsis"
      }
    }
  ]
}
```

### `locales/fr.json`

```json
{
  "locale": "fr",
  "direction": "ltr",
  "strings": {
    "promo.title": "Soldes d’été"
  },
  "nodeOverrides": {
    "title": {
      "box": { "width": 620 },
      "fit": { "minFontSize": 36 }
    }
  }
}
```

---

## 8) Implementation Checklist for Codex

Build these in order:

1. Package reader that opens `.lpkg`
2. Manifest validator
3. Scene parser and type model
4. Locale pack loader
5. Patch application
6. Localization key resolution with fallback
7. Text measurement and fit algorithm
8. Asset/font resolution and caching
9. Effective scene generator
10. React Native component
11. Rendering backend integration
12. Error reporting and debug overlay
13. Package validation CLI for developer use

---

## 9) Debug and Developer Experience

The renderer should optionally expose debug mode:

- node bounds overlay
- locale key display
- text fit diagnostics
- missing string warnings
- asset resolution trace

A debug render should be able to show:

- which locale pack was used
- which fallback string was chosen
- whether a patch was applied
- which assets/fonts were loaded

---

## 10) Non-Goals for v1

Do not require v1 to support:

- freeform editing at runtime
- animation playback
- nested timeline logic
- arbitrary rich text spans
- multi-step reflow across many linked text nodes
- live translation editing inside the renderer
- remote translation sync

Those can come later.

---

## 11) Recommended v1 Contract

The simplest viable contract is:

- one `.lpkg` file
- one manifest
- one base scene
- one locale pack loaded at a time
- optional patch per locale
- lazy asset loading
- deterministic rendering
- fallback locale support
- a single React Native component that feels like a normal asset loader

That keeps the runtime ergonomic while still giving you a rich authoring model behind the scenes.
