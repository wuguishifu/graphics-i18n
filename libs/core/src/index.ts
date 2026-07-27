/**
 * Platform-agnostic LPKG pipeline: container reading, locale negotiation,
 * patching, text fitting and effective-scene building. Renderers
 * (`@wuguishifu/react-graphics-i18n`, `@wuguishifu/react-native-graphics-i18n`)
 * build on this package; it has no React or DOM dependency and runs in Node.
 */

// Types
export type {
  PackageManifest,
  AssetEntry,
  FontEntry,
  LocaleEntry,
  AssetType,
} from './types/manifest.js';
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
export type {
  LocalePack,
  LocalePatch,
  LocaleNodeOverride,
  PatchNodeOverride,
} from './types/locale.js';
export type {
  EffectiveScene,
  EffectiveNode,
  EffectiveSceneMeta,
  DrawInstruction,
  ResolvedTextLayout,
  Matrix2D,
} from './types/effective.js';
export {
  LpkgError,
  type GraphicError,
  type GraphicErrorCode,
} from './types/errors.js';

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
export {
  openContainer,
  base64ToBytes,
  bytesToBase64,
  type LpkgContainer,
} from './package/container.js';
export { openPackage, packageIdentity, type OpenedPackage } from './package/openPackage.js';
export { validateManifest } from './package/validateManifest.js';
export {
  packLpkgFromFiles,
  createMemoryContainer,
  type LpkgFileContent,
  type PackFilesOptions,
} from './package/packContainer.js';
export {
  sourceKey,
  setDefaultSourceReader,
  getDefaultSourceReader,
  fetchSourceReader,
  memorySourceReader,
  type GraphicSource,
  type SourceReader,
} from './package/sourceReader.js';
export {
  buildEffectiveScene,
  collectVisibleAssetIds,
  collectVisibleFontFamilies,
} from './effective/buildEffectiveScene.js';
export {
  fitText,
  wrapText,
  type FitTextInput,
  type FitTextResult,
} from './layout/fitText.js';
export {
  ApproxTextMeasurer,
  approxTextMeasurer,
  type TextMeasurer,
} from './layout/textMeasurer.js';
export { clearAllCaches } from './cache/caches.js';
export { LruCache } from './cache/lru.js';
export { lineHeightPx } from './layout/textMeasurer.js';
export { resolveDirection, resolveAlign, isRtlLocale } from './layout/resolveDirection.js';
export {
  IDENTITY,
  multiply,
  matrixFromTransform,
  nodeLocalBounds,
} from './scene/normalizeScene.js';
export { parseScene, walkNodes, cloneScene } from './scene/parseScene.js';
