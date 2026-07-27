export type GraphicError =
  | { code: 'PACKAGE_NOT_FOUND'; message: string }
  | { code: 'INVALID_PACKAGE'; message: string; details?: unknown }
  | { code: 'SCENE_PARSE_FAILED'; message: string; details?: unknown }
  | { code: 'LOCALE_MISSING'; message: string; locale: string }
  | { code: 'STRING_MISSING'; message: string; key: string; locale: string }
  | { code: 'ASSET_MISSING'; message: string; assetId: string }
  | { code: 'FONT_MISSING'; message: string; fontId: string }
  | { code: 'TEXT_LAYOUT_FAILED'; message: string; nodeId: string }
  | { code: 'RENDER_BACKEND_FAILED'; message: string; details?: unknown };

export type GraphicErrorCode = GraphicError['code'];

export class LpkgError extends Error {
  readonly code: GraphicErrorCode;
  readonly info: GraphicError;

  constructor(info: GraphicError) {
    super(`[${info.code}] ${info.message}`);
    this.name = 'LpkgError';
    this.code = info.code;
    this.info = info;
  }
}

export function invalidPackage(message: string, details?: unknown): LpkgError {
  return new LpkgError({ code: 'INVALID_PACKAGE', message, details });
}
