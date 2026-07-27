/**
 * Platform-agnostic surface: everything except the React Native renderer.
 * Import from `@root/react-native-graphics-i18n/core` in Node/SSR contexts
 * where `react-native` cannot be resolved.
 */

// Types
export type { PackageManifest, AssetEntry, FontEntry, LocaleEntry, AssetType } from './types/manifest.js';
export type {
  Scene,
  SceneNode,
  GroupNode,
  RectNode,
  ImageNode,
  SvgNode,
  TextNode,
  PathNode,
  LineNode,
  BadgeNode,
  BaseNode,
  Transform2D,
  TextStyle,
  TextFit,
  TextWrap,
  TextNodeOverride,
  Box,
  Stroke,
} from './types/scene.js';
export type { LocalePack, LocalePatch, LocaleNodeOverride, PatchNodeOverride } from './types/locale.js';
export type {
  EffectiveScene,
  EffectiveNode,
  EffectiveSceneMeta,
  DrawInstruction,
  ResolvedTextLayout,
  Matrix2D,
} from './types/effective.js';
export { LpkgError, type GraphicError, type GraphicErrorCode } from './types/errors.js';

// Core pipeline
export {
  loadLocalizedGraphic,
  prefetchLocalizedGraphic,
  validateLocalizedGraphicPackage,
  type LoadPackageResult,
  type LoadOptions,
} from './api/loadLocalizedGraphic.js';
export { migratePackage } from './migrate/migratePackage.js';
export { resolveLocale, type ResolvedLocale } from './package/resolveLocale.js';
export { openContainer, type LpkgContainer } from './package/container.js';
export {
  sourceKey,
  setDefaultSourceReader,
  getDefaultSourceReader,
  memorySourceReader,
  type GraphicSource,
  type SourceReader,
} from './package/sourceReader.js';
export {
  buildEffectiveScene,
  collectVisibleAssetIds,
  collectVisibleFontFamilies,
} from './effective/buildEffectiveScene.js';
export { fitText, wrapText, type FitTextInput, type FitTextResult } from './layout/fitText.js';
export { ApproxTextMeasurer, approxTextMeasurer, type TextMeasurer } from './layout/textMeasurer.js';
export { clearAllCaches } from './cache/caches.js';
