import { Router } from 'express';
import { analyzeText, generateMetaTags } from '../services/seoService.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

/**
 * POST /api/seo/redirect-check
 * Follow redirect chain for a URL and return each hop.
 */
router.post('/redirect-check', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return next(new ValidationError('URL is required', 'MISSING_PARAMETER'));
    }

    // Basic URL validation
    try { new URL(url); } catch {
      return next(new ValidationError('Invalid URL format', 'INVALID_PARAMETER'));
    }

    const chain = [];
    let currentUrl = url;
    let maxRedirects = 10;
    const seen = new Set();

    while (maxRedirects-- > 0) {
      if (seen.has(currentUrl)) {
        chain.push({ url: currentUrl, status: 0, statusText: 'Redirect Loop Detected' });
        break;
      }
      seen.add(currentUrl);

      try {
        const response = await fetch(currentUrl, {
          redirect: 'manual',
          headers: { 'User-Agent': 'UtilityHub-RedirectChecker/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        chain.push({
          url: currentUrl,
          status: response.status,
          statusText: response.statusText,
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) break;
          currentUrl = new URL(location, currentUrl).toString();
        } else {
          break;
        }
      } catch (fetchErr) {
        chain.push({ url: currentUrl, status: 0, statusText: fetchErr.message || 'Connection failed' });
        break;
      }
    }

    if (maxRedirects < 0) {
      chain.push({ url: currentUrl, status: 0, statusText: 'Too many redirects (max 10)' });
    }

    return res.json({ success: true, chain });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/seo/analyze
 * Analyze text content for SEO quality.
 *
 * Body: { text: string, keyword?: string }
 * Returns: { success, score, suggestions, metrics }
 */
router.post('/analyze', async (req, res, next) => {
  try {
    let { text, url, keyword } = req.body;

    // If a URL is provided, fetch the page HTML and use that as the text to analyze
    if (url && typeof url === 'string') {
      try {
        new URL(url); // validate
      } catch {
        return next(new ValidationError('Invalid URL format', 'INVALID_PARAMETER'));
      }
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'ToolsPilot-SEOAnalyzer/1.0' },
          signal: AbortSignal.timeout(15000),
          redirect: 'follow',
        });
        if (!response.ok) {
          return next(new ValidationError(
            `Failed to fetch URL (HTTP ${response.status})`,
            'FETCH_FAILED'
          ));
        }
        text = await response.text();
      } catch (fetchErr) {
        return next(new ValidationError(
          `Could not fetch URL: ${fetchErr.message}`,
          'FETCH_FAILED'
        ));
      }
    }

    if (!text || typeof text !== 'string') {
      return next(new ValidationError(
        'Text content is required. Provide a "text" field or a "url" to fetch.',
        'MISSING_PARAMETER'
      ));
    }

    const result = analyzeText(text, { keyword });

    return res.json({
      success: true,
      score: result.score,
      seoScore: result.score,
      suggestions: result.suggestions,
      metrics: result.metrics,
      topKeywords: result.topKeywords,
      metaSuggestions: result.metaSuggestions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/seo/meta-tags
 * Generate Open Graph and Twitter Card meta tag snippets.
 *
 * Body: { title: string, description: string, imageUrl?: string, url?: string, type?: string }
 * Returns: { success, openGraph, twitterCard }
 */
router.post('/meta-tags', async (req, res, next) => {
  try {
    const { title, description, imageUrl, url, type } = req.body;

    if (!title || typeof title !== 'string') {
      return next(new ValidationError(
        'Title is required for meta tag generation.',
        'MISSING_PARAMETER'
      ));
    }
    if (!description || typeof description !== 'string') {
      return next(new ValidationError(
        'Description is required for meta tag generation.',
        'MISSING_PARAMETER'
      ));
    }

    const result = generateMetaTags({ title, description, imageUrl, url, type });

    return res.json({
      success: true,
      openGraph: result.openGraph,
      twitterCard: result.twitterCard,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
