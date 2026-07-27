export * from '@graphics-i18n/core';

// Web (SVG) renderer
export {
  LocalizedGraphic,
  type LocalizedGraphicProps,
} from './LocalizedGraphic.js';
export {
  useLocalizedGraphic,
  type UseLocalizedGraphicState,
  type UseLocalizedGraphicOptions,
  type LoadedGraphic,
} from './useLocalizedGraphic.js';
export { SvgGraphic, type SvgGraphicProps } from './SvgGraphic.js';
export { buildSvgResources, type SvgResources } from './svgResources.js';
export { createCanvasTextMeasurer } from './canvasTextMeasurer.js';
