import { describe, it, expect } from 'vitest';
import { summarize } from './textSummarizer.js';

// Helper: generate text of at least N chars with multiple sentences
function makeParagraph(sentenceCount = 10) {
  const sentences = [
    'The quick brown fox jumps over the lazy dog near the riverbank.',
    'Scientists have discovered a new species of deep-sea fish in the Pacific Ocean.',
    'Modern technology continues to reshape how people communicate across the globe.',
    'The ancient library contained thousands of scrolls from various civilizations.',
    'Climate change poses significant challenges to agricultural communities worldwide.',
    'Researchers published their findings in a prestigious international journal.',
    'The city council approved a new plan for sustainable urban development.',
    'Education remains one of the most powerful tools for social mobility.',
    'Artificial intelligence is transforming industries from healthcare to finance.',
    'The orchestra performed a stunning rendition of the classical symphony.',
    'Renewable energy sources are becoming increasingly cost-competitive with fossil fuels.',
    'The documentary explored the rich cultural heritage of indigenous communities.',
  ];
  return sentences.slice(0, sentenceCount).join(' ');
}

// ============================================================
// summarize — basic functionality
// ============================================================

describe('summarize', () => {
  const longText = makeParagraph(12);

  it('returns a short summary (~25% of sentences)', () => {
    const result = summarize(longText, 'short');
    expect(result.summary).toBeTruthy();
    expect(result.summaryLength).toBeLessThan(result.originalLength);
    expect(result.originalLength).toBe(longText.trim().length);
  });

  it('returns a medium summary (~50% of sentences)', () => {
    const result = summarize(longText, 'medium');
    expect(result.summary).toBeTruthy();
    expect(result.summaryLength).toBeLessThanOrEqual(result.originalLength);
  });

  it('returns a long summary (~75% of sentences)', () => {
    const result = summarize(longText, 'long');
    expect(result.summary).toBeTruthy();
    expect(result.summaryLength).toBeLessThanOrEqual(result.originalLength);
    // Long summary should be longer than short summary
    const shortResult = summarize(longText, 'short');
    expect(result.summaryLength).toBeGreaterThanOrEqual(shortResult.summaryLength);
  });

  it('short summary is shorter than medium, medium shorter than long', () => {
    const s = summarize(longText, 'short');
    const m = summarize(longText, 'medium');
    const l = summarize(longText, 'long');
    expect(s.summaryLength).toBeLessThanOrEqual(m.summaryLength);
    expect(m.summaryLength).toBeLessThanOrEqual(l.summaryLength);
  });

  it('returns correct originalLength and summaryLength', () => {
    const result = summarize(longText, 'medium');
    expect(result.originalLength).toBe(longText.trim().length);
    expect(result.summaryLength).toBe(result.summary.length);
  });
});

// ============================================================
// summarize — validation
// ============================================================

describe('summarize — validation', () => {
  it('throws on empty input', () => {
    expect(() => summarize('')).toThrow('Input text is required');
  });

  it('throws on null input', () => {
    expect(() => summarize(null)).toThrow('Input text is required');
  });

  it('throws on input shorter than 100 characters', () => {
    expect(() => summarize('Short text.')).toThrow('at least 100 characters');
  });

  it('throws on input exceeding 50000 characters', () => {
    const huge = 'A'.repeat(50001);
    expect(() => summarize(huge)).toThrow('at most 50000 characters');
  });

  it('throws on invalid length option', () => {
    const text = makeParagraph(10);
    expect(() => summarize(text, 'tiny')).toThrow('Invalid length');
  });

  it('defaults to medium when no length specified', () => {
    const text = makeParagraph(10);
    const result = summarize(text);
    expect(result.summary).toBeTruthy();
  });
});

// ============================================================
// summarize — edge cases
// ============================================================

describe('summarize — edge cases', () => {
  it('handles text with exactly 100 characters', () => {
    // Build a string of exactly 100 chars
    const base = 'This is a sentence that is used to pad the text to exactly one hundred characters in total length!!';
    const padded = base.padEnd(100, '.');
    const result = summarize(padded, 'medium');
    expect(result.summary).toBeTruthy();
  });

  it('handles single long sentence gracefully', () => {
    const single = 'A'.repeat(5) + ' word '.repeat(20) + 'end of the very long single sentence that keeps going and going.';
    // Ensure it's >= 100 chars
    expect(single.length).toBeGreaterThanOrEqual(100);
    const result = summarize(single, 'short');
    expect(result.summary).toBeTruthy();
  });
});
