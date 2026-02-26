import { describe, it, expect } from 'vitest';
import { formatCitation, formatBibliography } from './citationFormatter.js';

// ── Fixtures ─────────────────────────────────────────────────

const book = {
  type: 'book',
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  year: 1925,
  publisher: 'Scribner',
};

const journal = {
  type: 'journal',
  title: 'Neural correlates of consciousness',
  author: 'John Smith',
  year: 2021,
  journal: 'Nature Neuroscience',
  volume: '24',
  pages: '100-115',
  doi: '10.1038/nn.2021',
};

const website = {
  type: 'website',
  title: 'Climate Change FAQ',
  author: 'Jane Doe',
  year: 2023,
  publisher: 'Environmental Agency',
  url: 'https://example.com/climate',
};

// ============================================================
// Book citations
// ============================================================

describe('formatCitation — book', () => {
  it('formats APA 7th book', () => {
    const result = formatCitation(book, 'apa7');
    expect(result).toContain('Fitzgerald, F.');
    expect(result).toContain('(1925)');
    expect(result).toContain('*The Great Gatsby*');
    expect(result).toContain('Scribner');
  });

  it('formats MLA 9th book', () => {
    const result = formatCitation(book, 'mla9');
    expect(result).toContain('Fitzgerald, F. Scott');
    expect(result).toContain('*The Great Gatsby*');
    expect(result).toContain('Scribner');
    expect(result).toContain('1925');
  });

  it('formats Chicago 17th book', () => {
    const result = formatCitation(book, 'chicago17');
    expect(result).toContain('Fitzgerald, F. Scott');
    expect(result).toContain('*The Great Gatsby*');
    expect(result).toContain('1925');
  });

  it('formats Harvard book', () => {
    const result = formatCitation(book, 'harvard');
    expect(result).toContain('Fitzgerald, F.');
    expect(result).toContain('(1925)');
    expect(result).toContain('*The Great Gatsby*');
  });
});

// ============================================================
// Journal citations
// ============================================================

describe('formatCitation — journal', () => {
  it('formats APA 7th journal', () => {
    const result = formatCitation(journal, 'apa7');
    expect(result).toContain('Smith, J.');
    expect(result).toContain('(2021)');
    expect(result).toContain('*Nature Neuroscience*');
    expect(result).toContain('100-115');
    expect(result).toContain('https://doi.org/10.1038/nn.2021');
  });

  it('formats MLA 9th journal', () => {
    const result = formatCitation(journal, 'mla9');
    expect(result).toContain('Smith, John');
    expect(result).toContain('"Neural correlates of consciousness."');
    expect(result).toContain('vol. 24');
    expect(result).toContain('pp. 100-115');
  });

  it('formats Chicago 17th journal', () => {
    const result = formatCitation(journal, 'chicago17');
    expect(result).toContain('Smith, John');
    expect(result).toContain('"Neural correlates of consciousness."');
    expect(result).toContain('*Nature Neuroscience*');
  });

  it('formats Harvard journal', () => {
    const result = formatCitation(journal, 'harvard');
    expect(result).toContain('Smith, J.');
    expect(result).toContain('(2021)');
    expect(result).toContain("'Neural correlates of consciousness'");
    expect(result).toContain('pp. 100-115');
  });
});

// ============================================================
// Website citations
// ============================================================

describe('formatCitation — website', () => {
  it('formats APA 7th website', () => {
    const result = formatCitation(website, 'apa7');
    expect(result).toContain('Doe, J.');
    expect(result).toContain('(2023)');
    expect(result).toContain('https://example.com/climate');
  });

  it('formats MLA 9th website', () => {
    const result = formatCitation(website, 'mla9');
    expect(result).toContain('Doe, Jane');
    expect(result).toContain('"Climate Change FAQ."');
  });

  it('formats Chicago 17th website', () => {
    const result = formatCitation(website, 'chicago17');
    expect(result).toContain('"Climate Change FAQ."');
    expect(result).toContain('https://example.com/climate');
  });

  it('formats Harvard website', () => {
    const result = formatCitation(website, 'harvard');
    expect(result).toContain('Doe, J.');
    expect(result).toContain('Available at:');
  });
});

// ============================================================
// Bibliography
// ============================================================

describe('formatBibliography', () => {
  it('sorts entries alphabetically by author', () => {
    const sources = [
      { ...journal },                          // Smith
      { ...book },                             // Fitzgerald
      { type: 'book', title: 'Test', author: 'Alice Adams', year: 2020, publisher: 'Press' },
    ];
    const bib = formatBibliography(sources, 'apa7');
    expect(bib).toHaveLength(3);
    // Adams < Fitzgerald < Smith
    expect(bib[0]).toContain('Adams');
    expect(bib[1]).toContain('Fitzgerald');
    expect(bib[2]).toContain('Smith');
  });

  it('throws on empty sources array', () => {
    expect(() => formatBibliography([], 'apa7')).toThrow('At least one source');
  });
});

// ============================================================
// Validation
// ============================================================

describe('formatCitation — validation', () => {
  it('throws on invalid style', () => {
    expect(() => formatCitation(book, 'turabian')).toThrow('Invalid style');
  });

  it('throws on invalid source type', () => {
    expect(() => formatCitation({ type: 'podcast', title: 'Test' }, 'apa7')).toThrow('Invalid source type');
  });

  it('throws on missing title', () => {
    expect(() => formatCitation({ type: 'book' }, 'apa7')).toThrow('Source with title is required');
  });
});
