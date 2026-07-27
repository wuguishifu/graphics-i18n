import type { ResolvedTextLayout } from '../types/effective.js';
import type { Box, TextFit, TextStyle, TextWrap } from '../types/scene.js';
import { resolveAlign } from './resolveDirection.js';
import { lineHeightPx, type TextMeasurer } from './textMeasurer.js';

const ELLIPSIS = '…';
const DEFAULT_MIN_FONT_SIZE = 6;
const DEFAULT_STEP = 1;

export type FitTextInput = {
  text: string;
  box: Box;
  style: TextStyle;
  fit?: TextFit;
  wrap?: TextWrap;
  direction: 'ltr' | 'rtl';
  /** Whether alignment mirrors in RTL locales. Defaults to true. */
  rtlAware?: boolean;
  measurer: TextMeasurer;
};

export type FitTextResult = {
  layout: ResolvedTextLayout;
  /** Box after fitting — differs from the input only for `resize-box`. */
  bounds: Box;
};

/** Greedy line breaking (spec §4.4). `none` only honors explicit newlines. */
export function wrapText(
  text: string,
  style: TextStyle,
  fontSize: number,
  maxWidth: number,
  mode: TextWrap['mode'],
  measurer: TextMeasurer,
): string[] {
  const paragraphs = text.split('\n');
  if (mode === 'none') {
    return paragraphs;
  }
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }
    const units = mode === 'word' ? paragraph.split(/(\s+)/).filter((u) => u !== '') : [...paragraph];
    let current = '';
    for (const unit of units) {
      const candidate = current + unit;
      if (current === '' || measurer.measureWidth(candidate.trimEnd(), style, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current.trimEnd());
        current = unit.trimStart();
      }
      // A single unit wider than the box gets hard-broken by characters.
      while (
        measurer.measureWidth(current.trimEnd(), style, fontSize) > maxWidth &&
        current.trimEnd().length > 1
      ) {
        let cut = current.length - 1;
        while (cut > 1 && measurer.measureWidth(current.slice(0, cut), style, fontSize) > maxWidth) {
          cut -= 1;
        }
        lines.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    }
    if (current.trimEnd() !== '' || units.length === 0) {
      lines.push(current.trimEnd());
    }
  }
  return lines;
}

function truncateWithEllipsis(
  line: string,
  style: TextStyle,
  fontSize: number,
  maxWidth: number,
  measurer: TextMeasurer,
): string {
  if (measurer.measureWidth(line + ELLIPSIS, style, fontSize) <= maxWidth) {
    return line + ELLIPSIS;
  }
  let text = line;
  while (text.length > 0) {
    text = text.slice(0, -1).trimEnd();
    if (measurer.measureWidth(text + ELLIPSIS, style, fontSize) <= maxWidth) {
      return text + ELLIPSIS;
    }
  }
  return ELLIPSIS;
}

/**
 * Deterministic text fitting (spec §4.4): measure the localized string,
 * shrink/expand/truncate according to the fit mode, and return final lines
 * plus the (possibly resized) bounds.
 */
export function fitText(input: FitTextInput): FitTextResult {
  const { box, measurer, direction } = input;
  const fit = input.fit ?? { mode: 'none' as const };
  const wrapMode = input.wrap?.mode ?? 'word';
  const maxLines = input.wrap?.maxLines;

  const style: TextStyle = {
    ...input.style,
    align: resolveAlign(input.style.align, direction, input.rtlAware ?? true),
  };
  const text = style.uppercase ? input.text.toUpperCase() : input.text;

  const minFontSize = fit.minFontSize ?? (fit.mode === 'shrink' ? DEFAULT_MIN_FONT_SIZE : style.fontSize);
  const step = fit.step ?? DEFAULT_STEP;
  let fontSize = Math.min(style.fontSize, fit.maxFontSize ?? style.fontSize);

  const layoutAt = (size: number) => {
    const lines = wrapText(text, style, size, box.width, wrapMode, measurer);
    const lineH = lineHeightPx(style, size);
    const fitsLines = maxLines === undefined || lines.length <= maxLines;
    const fitsHeight = lines.length * lineH <= box.height + 0.01;
    const fitsWidth = lines.every((line) => measurer.measureWidth(line, style, size) <= box.width + 0.01);
    return { lines, lineH, fits: fitsLines && fitsHeight && fitsWidth };
  };

  let attempt = layoutAt(fontSize);
  if (fit.mode === 'shrink') {
    while (!attempt.fits && fontSize - step >= minFontSize) {
      fontSize -= step;
      attempt = layoutAt(fontSize);
    }
  }

  let lines = attempt.lines;
  const lineH = attempt.lineH;
  let bounds: Box = { ...box };
  let overflowed = !attempt.fits;
  let appliedEllipsis = false;

  if (!attempt.fits && fit.mode === 'resize-box') {
    bounds = { ...box, height: Math.max(box.height, lines.length * lineH) };
    overflowed = false;
  } else if (!attempt.fits) {
    const overflow = fit.overflow ?? (fit.mode === 'ellipsis' ? 'ellipsis' : 'clip');
    if (overflow === 'ellipsis') {
      const visibleByHeight = Math.max(1, Math.floor((box.height + 0.01) / lineH));
      const visible = Math.min(lines.length, visibleByHeight, maxLines ?? Infinity);
      if (visible < lines.length) {
        lines = lines.slice(0, visible);
        lines[lines.length - 1] = truncateWithEllipsis(
          lines[lines.length - 1],
          style,
          fontSize,
          box.width,
          measurer,
        );
        appliedEllipsis = true;
      } else {
        // Fits vertically but a line is too wide (wrap mode none/char edge).
        lines = lines.map((line) =>
          measurer.measureWidth(line, style, fontSize) > box.width
            ? truncateWithEllipsis(line, style, fontSize, box.width, measurer)
            : line,
        );
        appliedEllipsis = true;
      }
    }
  }

  return {
    layout: {
      text,
      lines,
      fontSize,
      lineHeight: lineH,
      style,
      direction,
      overflowed,
      appliedEllipsis,
    },
    bounds,
  };
}
