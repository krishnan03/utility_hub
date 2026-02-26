import { describe, it, expect } from 'vitest';
import { generateOutline } from './essayOutline.js';

const ESSAY_TYPES = ['argumentative', 'expository', 'narrative', 'compare-contrast', 'persuasive'];

// ============================================================
// All 5 essay types
// ============================================================

describe.each(ESSAY_TYPES)('generateOutline — %s', (type) => {
  const outline = generateOutline('the impact of technology on education', type);

  it('has introduction with hook and thesis', () => {
    expect(outline.introduction).toBeDefined();
    expect(outline.introduction.hook).toBeTruthy();
    expect(outline.introduction.thesis).toBeTruthy();
    expect(typeof outline.introduction.hook).toBe('string');
    expect(typeof outline.introduction.thesis).toBe('string');
  });

  it('has body paragraphs with topic sentences and supporting points', () => {
    expect(Array.isArray(outline.body)).toBe(true);
    outline.body.forEach((para) => {
      expect(para.topicSentence).toBeTruthy();
      expect(Array.isArray(para.supportingPoints)).toBe(true);
      expect(para.supportingPoints.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('has conclusion with restatement and closing thought', () => {
    expect(outline.conclusion).toBeDefined();
    expect(outline.conclusion.restatement).toBeTruthy();
    expect(outline.conclusion.closingThought).toBeTruthy();
  });

  it('includes the topic in generated content', () => {
    expect(outline.introduction.thesis).toContain('the impact of technology on education');
    expect(outline.conclusion.restatement).toContain('the impact of technology on education');
  });
});

// ============================================================
// Paragraph count
// ============================================================

describe('generateOutline — paragraph count', () => {
  it('defaults to 5 body paragraphs', () => {
    const outline = generateOutline('test topic', 'argumentative');
    expect(outline.body).toHaveLength(5);
  });

  it('respects custom paragraph count', () => {
    const outline = generateOutline('test topic', 'expository', 3);
    expect(outline.body).toHaveLength(3);
  });

  it('clamps to minimum of 3 paragraphs', () => {
    const outline = generateOutline('test topic', 'narrative', 1);
    expect(outline.body).toHaveLength(3);
  });

  it('clamps to maximum of 7 paragraphs', () => {
    const outline = generateOutline('test topic', 'persuasive', 10);
    expect(outline.body).toHaveLength(7);
  });
});

// ============================================================
// Structure validation
// ============================================================

describe('generateOutline — structure', () => {
  it('returns the correct top-level keys', () => {
    const outline = generateOutline('test', 'argumentative');
    expect(Object.keys(outline).sort()).toEqual(['body', 'conclusion', 'introduction']);
  });

  it('each body paragraph has exactly topicSentence and supportingPoints', () => {
    const outline = generateOutline('test', 'expository', 4);
    outline.body.forEach((para) => {
      expect(Object.keys(para).sort()).toEqual(['supportingPoints', 'topicSentence']);
    });
  });
});

// ============================================================
// Validation
// ============================================================

describe('generateOutline — validation', () => {
  it('throws on empty topic', () => {
    expect(() => generateOutline('', 'argumentative')).toThrow('Topic is required');
  });

  it('throws on invalid essay type', () => {
    expect(() => generateOutline('test', 'haiku')).toThrow('Invalid essay type');
  });

  it('throws on null topic', () => {
    expect(() => generateOutline(null, 'argumentative')).toThrow('Topic is required');
  });
});
