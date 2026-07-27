import type { TextStyle } from '../types/scene.js';
import { fitText, wrapText } from './fitText.js';
import { approxTextMeasurer } from './textMeasurer.js';

const style: TextStyle = {
  fontFamily: 'Inter',
  fontSize: 32,
  color: '#000',
  lineHeight: 1.2,
};

describe('wrapText', () => {
  it('wraps on word boundaries', () => {
    const lines = wrapText('the quick brown fox jumps', style, 32, 200, 'word', approxTextMeasurer);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ').replace(/\s+/g, ' ')).toBe('the quick brown fox jumps');
    for (const line of lines) {
      expect(approxTextMeasurer.measureWidth(line, style, 32)).toBeLessThanOrEqual(200);
    }
  });

  it('hard-breaks single words wider than the box', () => {
    const lines = wrapText('Kraftfahrzeughaftpflichtversicherung', style, 32, 150, 'word', approxTextMeasurer);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(approxTextMeasurer.measureWidth(line, style, 32)).toBeLessThanOrEqual(150);
    }
  });

  it('honors explicit newlines in none mode', () => {
    expect(wrapText('a\nb', style, 32, 10, 'none', approxTextMeasurer)).toEqual(['a', 'b']);
  });
});

describe('fitText', () => {
  const base = {
    box: { x: 0, y: 0, width: 300, height: 80 },
    style,
    direction: 'ltr' as const,
    measurer: approxTextMeasurer,
  };

  it('keeps the font size when the text fits', () => {
    const result = fitText({ ...base, text: 'Hi', fit: { mode: 'shrink', minFontSize: 10 } });
    expect(result.layout.fontSize).toBe(32);
    expect(result.layout.overflowed).toBe(false);
  });

  it('shrinks until the text fits', () => {
    const result = fitText({
      ...base,
      text: 'A considerably longer promotional headline',
      fit: { mode: 'shrink', minFontSize: 10, step: 2 },
    });
    expect(result.layout.fontSize).toBeLessThan(32);
    expect(result.layout.fontSize).toBeGreaterThanOrEqual(10);
    expect(result.layout.overflowed).toBe(false);
  });

  it('stops shrinking at minFontSize and applies the overflow policy', () => {
    const result = fitText({
      ...base,
      box: { x: 0, y: 0, width: 60, height: 20 },
      text: 'An impossibly long string for such a tiny box, truly enormous',
      fit: { mode: 'shrink', minFontSize: 18, overflow: 'ellipsis' },
    });
    expect(result.layout.fontSize).toBe(18);
    expect(result.layout.appliedEllipsis).toBe(true);
    expect(result.layout.lines[result.layout.lines.length - 1].endsWith('…')).toBe(true);
  });

  it('expands the box in resize-box mode', () => {
    const result = fitText({
      ...base,
      box: { x: 0, y: 0, width: 300, height: 30 },
      text: 'Multiple lines of text that will not fit in thirty pixels of height',
      fit: { mode: 'resize-box' },
    });
    expect(result.bounds.height).toBeGreaterThan(30);
    expect(result.layout.overflowed).toBe(false);
  });

  it('truncates with ellipsis in ellipsis mode', () => {
    const result = fitText({
      ...base,
      box: { x: 0, y: 0, width: 200, height: 38 },
      text: 'This line is definitely much too long to fit here',
      fit: { mode: 'ellipsis' },
    });
    expect(result.layout.appliedEllipsis).toBe(true);
    expect(result.layout.lines).toHaveLength(1);
  });

  it('respects wrap.maxLines', () => {
    const result = fitText({
      ...base,
      box: { x: 0, y: 0, width: 120, height: 500 },
      text: 'one two three four five six seven eight',
      wrap: { mode: 'word', maxLines: 2 },
      fit: { mode: 'ellipsis' },
    });
    expect(result.layout.lines.length).toBeLessThanOrEqual(2);
  });

  it('applies uppercase before measuring', () => {
    const result = fitText({ ...base, text: 'hello', style: { ...style, uppercase: true } });
    expect(result.layout.lines[0]).toBe('HELLO');
  });

  it('mirrors alignment for RTL', () => {
    const result = fitText({ ...base, text: 'مرحبا', direction: 'rtl', style: { ...style, align: 'left' } });
    expect(result.layout.style.align).toBe('right');
    const optOut = fitText({
      ...base,
      text: 'مرحبا',
      direction: 'rtl',
      rtlAware: false,
      style: { ...style, align: 'left' },
    });
    expect(optOut.layout.style.align).toBe('left');
  });

  it('defaults RTL text to the leading (right) edge', () => {
    const result = fitText({ ...base, text: 'مرحبا', direction: 'rtl', style });
    expect(result.layout.style.align).toBe('right');
    const ltr = fitText({ ...base, text: 'hello', direction: 'ltr', style });
    expect(ltr.layout.style.align).toBe('left');
  });

  it('is deterministic', () => {
    const input = {
      ...base,
      text: 'A considerably longer promotional headline',
      fit: { mode: 'shrink' as const, minFontSize: 10 },
    };
    expect(fitText(input)).toEqual(fitText(input));
  });
});
