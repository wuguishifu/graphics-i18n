export type AssetType = 'image' | 'svg' | 'font' | 'video' | 'json' | 'other';

export type AssetEntry = {
  path: string;
  type: AssetType;
  sha256?: string;
  width?: number;
  height?: number;
  mimeType?: string;
};

export type FontEntry = {
  path: string;
  family: string;
  weight?: number;
  style?: 'normal' | 'italic';
  sha256?: string;
};

export type LocaleEntry = {
  locale: string;
  label?: string;
  direction?: 'ltr' | 'rtl';
  patch?: boolean;
  strings?: boolean;
};

export type PackageManifest = {
  schemaVersion: string;
  packageId: string;
  packageVersion: number;

  name?: string;
  description?: string;

  canvas: {
    width: number;
    height: number;
    background?: string;
    pixelRatioHint?: number;
  };

  render: {
    engine: 'skia' | 'svg' | 'auto';
    defaultLocale?: string;
    fallbackLocale: string;
    textDirection?: 'ltr' | 'rtl';
  };

  chunks: {
    scene: string;
    locales: Record<string, string>;
    patches?: Record<string, string>;
    assets?: Record<string, string>;
    fonts?: Record<string, string>;
  };

  locales: LocaleEntry[];

  assets: Record<string, AssetEntry>;

  fonts?: Record<string, FontEntry>;

  integrity?: {
    sha256?: string;
    chunkHashes?: Record<string, string>;
  };

  createdAt?: string;
  updatedAt?: string;
  authoringTool?: {
    name: string;
    version: string;
  };
};
