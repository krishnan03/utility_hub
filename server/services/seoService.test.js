import { describe, it, expect } from 'vitest';
import { analyzeText, generateMetaTags } from './seoService.js';

describe('seoService', () => {
  describe('analyzeText', () => {
    it('should throw for missing text', () => {
      expect(() => analyzeText()).toThrow('Text content is required');
      expect(() => analyzeText('')).toThrow('Text content is required');
      expect(() => analyzeText(123)).toThrow('Text content is required');
    });

    it('should throw for empty/whitespace-only text', () => {
      expect(() => analyzeText('   ')).toThrow('Text content cannot be empty');
    });

    it('should return score, suggestions, and metrics for valid text', () => {
      const text = 'Search engine optimization is important for web visibility. Good content helps users find what they need. Writing quality articles improves rankings over time.';
      const result = analyzeText(text);

      expect(result).toHaveProperty('score');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result).toHaveProperty('metrics');
      expect(result.metrics.wordCount).toBeGreaterThan(0);
      expect(result.metrics.sentenceCount).toBeGreaterThan(0);
      expect(result.metrics.paragraphCount).toBeGreaterThan(0);
      expect(result.metrics.readability).toHaveProperty('fleschReadingEase');
      expect(result.metrics.readability).toHaveProperty('fleschKincaidGrade');
    });

    it('should calculate keyword density when keyword is provided', () => {
      const text = 'SEO is important. SEO helps websites rank. Good SEO practices matter for every website.';
      const result = analyzeText(text, { keyword: 'SEO' });

      expect(result.metrics.keywordDensity).toBeGreaterThan(0);
      expect(typeof result.metrics.keywordDensity).toBe('number');
    });

    it('should return null keyword density when no keyword provided', () => {
      const text = 'This is a simple test sentence for analysis.';
      const result = analyzeText(text);

      expect(result.metrics.keywordDensity).toBeNull();
    });

    it('should detect markdown headings', () => {
      const text = '# Main Title\n\nSome content here.\n\n## Subtitle\n\nMore content here.';
      const result = analyzeText(text);

      expect(result.metrics.headingCount).toBe(2);
      expect(result.metrics.headings[0]).toEqual({ level: 1, text: 'Main Title' });
      expect(result.metrics.headings[1]).toEqual({ level: 2, text: 'Subtitle' });
    });

    it('should suggest improvements for short content', () => {
      const text = 'Short content.';
      const result = analyzeText(text);

      const hasShortSuggestion = result.suggestions.some((s) => s.toLowerCase().includes('short'));
      expect(hasShortSuggestion).toBe(true);
    });

    it('should suggest adding headings when none present', () => {
      const text = 'This is a paragraph without any headings. It just has plain text content that goes on for a while.';
      const result = analyzeText(text);

      const hasHeadingSuggestion = result.suggestions.some((s) => s.toLowerCase().includes('heading'));
      expect(hasHeadingSuggestion).toBe(true);
    });

    it('should give higher score for well-structured content', () => {
      const shortResult = analyzeText('Hello.');
      const longText = `# Introduction

Search engine optimization is the practice of improving website visibility in search results. Good SEO involves creating quality content that serves user intent.

## Why SEO Matters

Websites that rank higher in search results receive more organic traffic. This traffic is valuable because users are actively searching for related topics.

## Best Practices

Write clear, well-structured content. Use headings to organize your ideas. Include relevant keywords naturally throughout the text. Make sure your content provides genuine value to readers.

## Conclusion

SEO is an ongoing process that requires attention to content quality, technical performance, and user experience.`;

      const longResult = analyzeText(longText, { keyword: 'SEO' });

      expect(longResult.score).toBeGreaterThan(shortResult.score);
    });
  });

  describe('generateMetaTags', () => {
    it('should throw for missing title', () => {
      expect(() => generateMetaTags({ description: 'desc' })).toThrow('Title is required');
      expect(() => generateMetaTags({ title: '', description: 'desc' })).toThrow('Title is required');
    });

    it('should throw for missing description', () => {
      expect(() => generateMetaTags({ title: 'Title' })).toThrow('Description is required');
      expect(() => generateMetaTags({ title: 'Title', description: '' })).toThrow('Description is required');
    });

    it('should generate Open Graph tags', () => {
      const result = generateMetaTags({
        title: 'My Page',
        description: 'A great page',
      });

      expect(result.openGraph).toContain('og:title');
      expect(result.openGraph).toContain('My Page');
      expect(result.openGraph).toContain('og:description');
      expect(result.openGraph).toContain('A great page');
      expect(result.openGraph).toContain('og:type');
      expect(result.openGraph).toContain('website');
    });

    it('should generate Twitter Card tags', () => {
      const result = generateMetaTags({
        title: 'My Page',
        description: 'A great page',
      });

      expect(result.twitterCard).toContain('twitter:card');
      expect(result.twitterCard).toContain('summary');
      expect(result.twitterCard).toContain('twitter:title');
      expect(result.twitterCard).toContain('twitter:description');
    });

    it('should include image tags when imageUrl is provided', () => {
      const result = generateMetaTags({
        title: 'My Page',
        description: 'A great page',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.openGraph).toContain('og:image');
      expect(result.openGraph).toContain('https://example.com/image.jpg');
      expect(result.twitterCard).toContain('twitter:image');
      expect(result.twitterCard).toContain('summary_large_image');
    });

    it('should include url tag when url is provided', () => {
      const result = generateMetaTags({
        title: 'My Page',
        description: 'A great page',
        url: 'https://example.com/page',
      });

      expect(result.openGraph).toContain('og:url');
      expect(result.openGraph).toContain('https://example.com/page');
    });

    it('should use custom type when provided', () => {
      const result = generateMetaTags({
        title: 'My Article',
        description: 'An article',
        type: 'article',
      });

      expect(result.openGraph).toContain('article');
    });

    it('should escape HTML special characters', () => {
      const result = generateMetaTags({
        title: 'Title with "quotes" & <tags>',
        description: 'Desc with "quotes"',
      });

      expect(result.openGraph).toContain('&amp;');
      expect(result.openGraph).toContain('&quot;');
      expect(result.openGraph).toContain('&lt;');
      expect(result.openGraph).toContain('&gt;');
    });
  });
});
