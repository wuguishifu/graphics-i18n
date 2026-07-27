import type { Box, TextFit, TextStyle, TextWrap, Transform2D } from './scene.js';

export type LocaleNodeOverride = {
  box?: Partial<Box>;
  style?: Partial<TextStyle>;
  fit?: Partial<TextFit>;
  wrap?: Partial<TextWrap>;
};

export type LocalePack = {
  locale: string;
  direction?: 'ltr' | 'rtl';
  strings: Record<string, string>;
  nodeOverrides?: Record<string, LocaleNodeOverride>;
  assetOverrides?: Record<string, string>; // assetId -> alt assetId
  fontOverrides?: Record<string, string>; // font family -> fontId
};

export type PatchNodeOverride = {
  visible?: boolean;
  transform?: Partial<Transform2D>;
  box?: Partial<Box>;
  style?: Partial<TextStyle>;
  fit?: Partial<TextFit>;
};

export type LocalePatch = {
  nodes: Record<string, PatchNodeOverride>;
};
