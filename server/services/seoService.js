import { ValidationError } from '../utils/errors.js';

/**
 * Flesch-Kincaid readability helpers
 */
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 2) return 1;

  let count = 0;
  const vowels = 'aeiouy';
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const isVowel = vowels.includes(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }

  // Silent e
  if (w.endsWith('e') && count > 1) count--;
  // Words like "le" at end
  if (w.endsWith('le') && w.length > 2 && !vowels.includes(w[w.length - 3])) count++;

  return Math.max(count, 1);
}

function splitSentences(text) {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitWords(text) {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9'-]/g, ''))
    .filter((w) => w.length > 0);
}

/**
 * Calculate Flesch-Kincaid Reading Ease score.
 * Higher = easier to read. Range roughly 0–100.
 */
function fleschReadingEase(words, sentences, syllables) {
  if (sentences === 0 || words === 0) return 0;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

/**
 * Calculate Flesch-Kincaid Grade Level.
 */
function fleschKincaidGrade(words, sentences, syllables) {
  if (sentences === 0 || words === 0) return 0;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

/**
 * Calculate keyword density for a given keyword in the text.
 * Returns percentage (0–100).
 */
function calculateKeywordDensity(words, keyword) {
  if (!keyword || words.length === 0) return 0;
  const kw = keyword.toLowerCase();
  const matches = words.filter((w) => w.toLowerCase() === kw).length;
  return Math.round((matches / words.length) * 10000) / 100;
}

/**
 * Detect heading-like lines in plain text (lines that are short, capitalized, or prefixed with #).
 */
function detectHeadings(text) {
  const lines = text.split('\n');
  const headings = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Markdown-style headings
    const mdMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (mdMatch) {
      headings.push({ level: mdMatch[1].length, text: mdMatch[2].trim() });
      continue;
    }

    // Short all-caps lines (likely headings)
    if (trimmed.length <= 80 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      headings.push({ level: 2, text: trimmed });
    }
  }

  return headings;
}

/**
 * Generate SEO suggestions based on analysis metrics.
 */
function generateSuggestions(metrics) {
  const suggestions = [];

  // Word count
  if (metrics.wordCount < 300) {
    suggestions.push('Content is too short. Aim for at least 300 words for better SEO.');
  } else if (metrics.wordCount < 600) {
    suggestions.push('Content is somewhat short. Consider expanding to 600+ words for improved rankings.');
  } else if (metrics.wordCount > 2500) {
    suggestions.push('Content is very long. Consider breaking it into multiple pages or adding a table of contents.');
  }

  // Readability
  if (metrics.readability.fleschReadingEase < 30) {
    suggestions.push('Content is very difficult to read. Simplify sentences and use shorter words.');
  } else if (metrics.readability.fleschReadingEase < 50) {
    suggestions.push('Content readability could be improved. Try shorter sentences and simpler vocabulary.');
  } else if (metrics.readability.fleschReadingEase > 80) {
    suggestions.push('Content is very easy to read — great for broad audiences.');
  }

  // Keyword density
  if (metrics.keywordDensity !== null) {
    if (metrics.keywordDensity === 0) {
      suggestions.push('Target keyword not found in content. Include it naturally throughout the text.');
    } else if (metrics.keywordDensity < 0.5) {
      suggestions.push('Keyword density is low. Try to include the target keyword a few more times.');
    } else if (metrics.keywordDensity > 3) {
      suggestions.push('Keyword density is too high (keyword stuffing). Reduce keyword usage to appear natural.');
    } else {
      suggestions.push('Keyword density is in a good range (0.5–3%).');
    }
  }

  // Headings
  if (metrics.headingCount === 0) {
    suggestions.push('No headings detected. Use headings (H1, H2, etc.) to structure your content.');
  }

  // Sentence length
  if (metrics.avgSentenceLength > 25) {
    suggestions.push('Average sentence length is high. Break long sentences into shorter ones for readability.');
  }

  // Paragraphs
  if (metrics.paragraphCount <= 1 && metrics.wordCount > 150) {
    suggestions.push('Content appears to be a single block. Break it into multiple paragraphs for better readability.');
  }

  return suggestions;
}

/**
 * Calculate an overall SEO score (0–100) from metrics.
 */
function calculateScore(metrics) {
  let score = 50; // baseline

  // Word count scoring (max +20)
  if (metrics.wordCount >= 600 && metrics.wordCount <= 2500) {
    score += 20;
  } else if (metrics.wordCount >= 300) {
    score += 10;
  } else if (metrics.wordCount < 100) {
    score -= 10;
  }

  // Readability scoring (max +20)
  const ease = metrics.readability.fleschReadingEase;
  if (ease >= 50 && ease <= 80) {
    score += 20;
  } else if (ease >= 30) {
    score += 10;
  } else {
    score += 5;
  }

  // Keyword density scoring (max +20)
  if (metrics.keywordDensity !== null) {
    if (metrics.keywordDensity >= 0.5 && metrics.keywordDensity <= 3) {
      score += 20;
    } else if (metrics.keywordDensity > 0 && metrics.keywordDensity < 0.5) {
      score += 10;
    } else if (metrics.keywordDensity > 3) {
      score += 5;
    }
  }

  // Heading structure (max +10)
  if (metrics.headingCount >= 2) {
    score += 10;
  } else if (metrics.headingCount === 1) {
    score += 5;
  }

  // Paragraph structure (max +10)
  if (metrics.paragraphCount >= 3) {
    score += 10;
  } else if (metrics.paragraphCount >= 2) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Analyze text content for SEO quality.
 *
 * @param {string} text - The text content to analyze
 * @param {object} [options] - Analysis options
 * @param {string} [options.keyword] - Target keyword to check density for
 * @returns {{ score: number, suggestions: string[], metrics: object }}
 */
export function analyzeText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    throw new ValidationError('Text content is required for SEO analysis', 'MISSING_PARAMETER');
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Text content cannot be empty', 'INVALID_PARAMETER');
  }

  const words = splitWords(trimmed);
  const sentences = splitSentences(trimmed);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const headings = detectHeadings(trimmed);
  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const keyword = options.keyword || null;
  const keywordDensity = keyword ? calculateKeywordDensity(words, keyword) : null;

  const metrics = {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    avgSentenceLength: sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : 0,
    syllableCount: totalSyllables,
    headingCount: headings.length,
    headings,
    keywordDensity,
    readability: {
      fleschReadingEase: Math.round(fleschReadingEase(words.length, sentences.length, totalSyllables) * 10) / 10,
      fleschKincaidGrade: Math.round(fleschKincaidGrade(words.length, sentences.length, totalSyllables) * 10) / 10,
    },
  };

  const suggestions = generateSuggestions(metrics);
  const score = calculateScore(metrics);

  return { score, suggestions, metrics };
}

/**
 * Generate Open Graph and Twitter Card meta tag HTML snippets.
 *
 * @param {object} metaConfig - Meta tag configuration
 * @param {string} metaConfig.title - Page title
 * @param {string} metaConfig.description - Page description
 * @param {string} [metaConfig.imageUrl] - Image URL for social sharing
 * @param {string} [metaConfig.url] - Canonical page URL
 * @param {string} [metaConfig.type] - OG type (default: "website")
 * @returns {{ openGraph: string, twitterCard: string }}
 */
export function generateMetaTags(metaConfig = {}) {
  if (!metaConfig.title || typeof metaConfig.title !== 'string') {
    throw new ValidationError('Title is required for meta tag generation', 'MISSING_PARAMETER');
  }
  if (!metaConfig.description || typeof metaConfig.description !== 'string') {
    throw new ValidationError('Description is required for meta tag generation', 'MISSING_PARAMETER');
  }

  const { title, description, imageUrl, url, type = 'website' } = metaConfig;

  // Build Open Graph tags
  const ogTags = [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="${escapeHtml(type)}" />`,
  ];
  if (url) ogTags.push(`<meta property="og:url" content="${escapeHtml(url)}" />`);
  if (imageUrl) ogTags.push(`<meta property="og:image" content="${escapeHtml(imageUrl)}" />`);

  // Build Twitter Card tags
  const twitterTags = [
    `<meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  ];
  if (imageUrl) twitterTags.push(`<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`);

  return {
    openGraph: ogTags.join('\n'),
    twitterCard: twitterTags.join('\n'),
  };
}

/**
 * Escape HTML special characters for safe attribute embedding.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
