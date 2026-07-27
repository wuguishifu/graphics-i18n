export type Transform2D = {
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

export type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Stroke = {
  color: string;
  width: number;
};

export type TextStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number | 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number; // multiplier of fontSize
  letterSpacing?: number;
  color: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  underline?: boolean;
  strike?: boolean;
  uppercase?: boolean;
};

export type TextFit = {
  mode: 'none' | 'shrink' | 'resize-box' | 'ellipsis' | 'scroll';
  minFontSize?: number;
  maxFontSize?: number;
  step?: number;
  overflow?: 'clip' | 'ellipsis';
};

export type TextWrap = {
  mode: 'word' | 'char' | 'none';
  maxLines?: number;
};

export type TextNodeOverride = {
  box?: Partial<Box>;
  style?: Partial<TextStyle>;
  fit?: Partial<TextFit>;
  wrap?: Partial<TextWrap>;
};

export type BaseNode = {
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

export type GroupNode = BaseNode & {
  type: 'group';
  children: SceneNode[];
  layout?: {
    mode?: 'free' | 'vertical' | 'horizontal';
    gap?: number;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'space-between';
  };
};

export type RectNode = BaseNode & {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  fill?: string;
  stroke?: Stroke;
};

export type ImageNode = BaseNode & {
  type: 'image';
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit?: 'contain' | 'cover' | 'fill' | 'none';
};

export type SvgNode = BaseNode & {
  type: 'svg';
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextNode = BaseNode & {
  type: 'text';
  bind: string; // localization key
  fallbackText?: string;
  box: Box;
  style: TextStyle;
  fit?: TextFit;
  wrap?: TextWrap;
  rtlAware?: boolean;
  localeOverrides?: Record<string, Partial<TextNodeOverride>>;
};

export type PathNode = BaseNode & {
  type: 'path';
  d: string;
  fill?: string;
  stroke?: Stroke;
};

export type LineNode = BaseNode & {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: Stroke;
};

export type BadgeNode = BaseNode & {
  type: 'badge';
  // Literal text, or a localization key when prefixed with "@" (e.g. "@promo.badge").
  text: string;
  box: Box;
  style: TextStyle;
  background: {
    fill: string;
    radius: number;
  };
};

export type SceneNode =
  | GroupNode
  | RectNode
  | ImageNode
  | SvgNode
  | TextNode
  | PathNode
  | LineNode
  | BadgeNode;

export type Scene = {
  sceneVersion: string;
  root: SceneNode[];
};
