import { describe, it, expect } from 'vitest';
import { analyzeAcademicText } from './academicMetrics.js';

// ============================================================
// Empty / Edge Cases
// ============================================================

describe('analyzeAcademicText — edge cases', () => {
  it('returns zeros for empty string', () => {
    const r = analyzeAcademicText('');
    expect(r.wordCount).toBe(0);
    expect(r.charCount).toBe(0);
    expect(r.sentenceCount).toBe(0);
    expect(r.paragraphCount).toBe(0);
    expect(r.pagesDoubleSpaced).toBe(0);
    expect(r.pagesSingleSpaced).toBe(0);
    expect(r.speakingTimeMinutes).toBe(0);
    expect(r.readability.level).toBe('Elementary');
  });

  it('returns zeros for whitespace-only string', () => {
    const r = analyzeAcademicText('   \n\n  ');
    expect(r.wordCount).toBe(0);
  });

  it('returns zeros for null/undefined', () => {
    expect(analyzeAcademicText(null).wordCount).toBe(0);
    expect(analyzeAcademicText(undefined).wordCount).toBe(0);
  });
});

// ============================================================
// Word Count
// ============================================================

describe('analyzeAcademicText — word count', () => {
  it('counts words correctly', () => {
    const r = analyzeAcademicText('The quick brown fox jumps.');
    expect(r.wordCount).toBe(5);
  });

  it('counts single word', () => {
    const r = analyzeAcademicText('Hello');
    expect(r.wordCount).toBe(1);
  });

  it('handles multiple spaces between words', () => {
    const r = analyzeAcademicText('hello   world');
    expect(r.wordCount).toBe(2);
  });
});

// ============================================================
// Character Count
// ============================================================

describe('analyzeAcademicText — char count', () => {
  it('counts all characters including spaces', () => {
    const r = analyzeAcademicText('Hello World');
    expect(r.charCount).toBe(11);
  });
});

// ============================================================
// Sentence Count
// ============================================================

describe('analyzeAcademicText — sentence count', () => {
  it('counts sentences ending with periods', () => {
    const r = analyzeAcademicText('Hello world. This is a test. Done.');
    expect(r.sentenceCount).toBe(3);
  });

  it('counts sentences with mixed punctuation', () => {
    const r = analyzeAcademicText('Hello! How are you? Fine.');
    expect(r.sentenceCount).toBe(3);
  });
});

// ============================================================
// Paragraph Count
// ============================================================

describe('analyzeAcademicText — paragraph count', () => {
  it('counts paragraphs separated by double newlines', () => {
    const r = analyzeAcademicText('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.');
    expect(r.paragraphCount).toBe(3);
  });

  it('returns 1 for single paragraph', () => {
    const r = analyzeAcademicText('Just one paragraph here.');
    expect(r.paragraphCount).toBe(1);
  });
});

// ============================================================
// Page Estimates
// ============================================================

describe('analyzeAcademicText — page estimates', () => {
  it('estimates double-spaced pages at 250 words/page', () => {
    const words = Array(500).fill('word').join(' ') + '.';
    const r = analyzeAcademicText(words);
    expect(r.pagesDoubleSpaced).toBe(2);
  });

  it('estimates single-spaced pages at 500 words/page', () => {
    const words = Array(500).fill('word').join(' ') + '.';
    const r = analyzeAcademicText(words);
    expect(r.pagesSingleSpaced).toBe(1);
  });

  it('returns fractional pages for partial content', () => {
    const words = Array(125).fill('word').join(' ') + '.';
    const r = analyzeAcademicText(words);
    expect(r.pagesDoubleSpaced).toBe(0.5);
  });
});

// ============================================================
// Speaking Time
// ============================================================

describe('analyzeAcademicText — speaking time', () => {
  it('estimates speaking time at 130 wpm', () => {
    const words = Array(130).fill('word').join(' ') + '.';
    const r = analyzeAcademicText(words);
    expect(r.speakingTimeMinutes).toBe(1);
  });

  it('estimates fractional minutes', () => {
    const words = Array(65).fill('word').join(' ') + '.';
    const r = analyzeAcademicText(words);
    expect(r.speakingTimeMinutes).toBe(0.5);
  });
});

// ============================================================
// Readability Scores
// ============================================================

describe('analyzeAcademicText — readability', () => {
  it('returns numeric readability scores', () => {
    const text = 'The cat sat on the mat. The dog ran in the park. Birds fly in the sky.';
    const r = analyzeAcademicText(text);
    expect(typeof r.readability.fleschKincaid).toBe('number');
    expect(typeof r.readability.fleschReadingEase).toBe('number');
    expect(typeof r.readability.gunningFog).toBe('number');
    expect(typeof r.readability.colemanLiau).toBe('number');
  });

  it('gives high reading ease for simple text', () => {
    const text = 'The cat sat. The dog ran. A bird flew. The sun set. It was fun.';
    const r = analyzeAcademicText(text);
    expect(r.readability.fleschReadingEase).toBeGreaterThan(50);
  });

  it('gives lower reading ease for complex text', () => {
    const text = 'The epistemological ramifications of phenomenological consciousness necessitate comprehensive interdisciplinary investigation. Methodological considerations fundamentally influence experimental reproducibility.';
    const r = analyzeAcademicText(text);
    expect(r.readability.fleschReadingEase).toBeLessThan(30);
  });
});

// ============================================================
// Education Level Classification
// ============================================================

describe('analyzeAcademicText — education level', () => {
  it('classifies simple text as Elementary or Middle School', () => {
    const text = 'The cat sat on the mat. The dog ran. It was fun. I like it.';
    const r = analyzeAcademicText(text);
    expect(['Elementary', 'Middle School']).toContain(r.readability.level);
  });

  it('classifies complex academic text as College or Graduate', () => {
    const text = 'The epistemological ramifications of phenomenological consciousness necessitate comprehensive interdisciplinary investigation. Methodological considerations fundamentally influence experimental reproducibility throughout contemporary academic discourse.';
    const r = analyzeAcademicText(text);
    expect(['College', 'Graduate']).toContain(r.readability.level);
  });

  it('returns a valid level string', () => {
    const text = 'Hello world. This is a test.';
    const r = analyzeAcademicText(text);
    expect(['Elementary', 'Middle School', 'High School', 'College', 'Graduate']).toContain(r.readability.level);
  });
});
