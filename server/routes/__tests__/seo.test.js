import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

describe('SEO Routes', () => {
  describe('POST /api/seo/analyze', () => {
    it('should return 400 when no text is provided', async () => {
      const res = await request(app)
        .post('/api/seo/analyze')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.message).toContain('Text');
    });

    it('should return 400 when text is not a string', async () => {
      const res = await request(app)
        .post('/api/seo/analyze')
        .send({ text: 123 })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should analyze text and return score, suggestions, and metrics', async () => {
      const res = await request(app)
        .post('/api/seo/analyze')
        .send({
          text: 'Search engine optimization helps websites rank higher in search results. Good SEO practices include writing quality content and using proper headings.',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.score).toBeGreaterThanOrEqual(0);
      expect(res.body.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(res.body.suggestions)).toBe(true);
      expect(res.body.metrics).toBeDefined();
      expect(res.body.metrics.wordCount).toBeGreaterThan(0);
      expect(res.body.metrics.sentenceCount).toBeGreaterThan(0);
      expect(res.body.metrics.readability).toBeDefined();
    });

    it('should include keyword density when keyword is provided', async () => {
      const res = await request(app)
        .post('/api/seo/analyze')
        .send({
          text: 'SEO is important. SEO helps websites. Good SEO matters.',
          keyword: 'SEO',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.metrics.keywordDensity).toBeGreaterThan(0);
    });

    it('should return null keyword density when no keyword provided', async () => {
      const res = await request(app)
        .post('/api/seo/analyze')
        .send({ text: 'Some content without a target keyword specified.' })
        .expect(200);

      expect(res.body.metrics.keywordDensity).toBeNull();
    });
  });

  describe('POST /api/seo/meta-tags', () => {
    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/seo/meta-tags')
        .send({ description: 'A description' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Title');
    });

    it('should return 400 when description is missing', async () => {
      const res = await request(app)
        .post('/api/seo/meta-tags')
        .send({ title: 'A title' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Description');
    });

    it('should generate meta tags with title and description', async () => {
      const res = await request(app)
        .post('/api/seo/meta-tags')
        .send({
          title: 'My Website',
          description: 'A great website about things',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.openGraph).toContain('og:title');
      expect(res.body.openGraph).toContain('My Website');
      expect(res.body.openGraph).toContain('og:description');
      expect(res.body.twitterCard).toContain('twitter:title');
      expect(res.body.twitterCard).toContain('twitter:description');
    });

    it('should include image tags when imageUrl is provided', async () => {
      const res = await request(app)
        .post('/api/seo/meta-tags')
        .send({
          title: 'My Website',
          description: 'A great website',
          imageUrl: 'https://example.com/img.jpg',
        })
        .expect(200);

      expect(res.body.openGraph).toContain('og:image');
      expect(res.body.openGraph).toContain('https://example.com/img.jpg');
      expect(res.body.twitterCard).toContain('twitter:image');
      expect(res.body.twitterCard).toContain('summary_large_image');
    });

    it('should include url tag when url is provided', async () => {
      const res = await request(app)
        .post('/api/seo/meta-tags')
        .send({
          title: 'My Website',
          description: 'A great website',
          url: 'https://example.com',
        })
        .expect(200);

      expect(res.body.openGraph).toContain('og:url');
      expect(res.body.openGraph).toContain('https://example.com');
    });

    it('should escape special characters in output', async () => {
      const res = await request(app)
        .post('/api/seo/meta-tags')
        .send({
          title: 'Title & "More"',
          description: 'Desc <script>',
        })
        .expect(200);

      expect(res.body.openGraph).toContain('&amp;');
      expect(res.body.openGraph).toContain('&quot;');
      expect(res.body.twitterCard).toContain('&lt;');
    });
  });
});
