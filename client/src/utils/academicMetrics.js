/**
 * Academic Text Metrics — readability scores, page estimates, speaking time.
 * Pure client-side, no server calls.
 */

/**
 * Count syllables in a word (English heuristic).
 * @param {string} word
 * @returns {number}
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');

  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Classify education level from Flesch-Kincaid grade level.
 * @param {number} gradeLevel
 * @returns {string}
 */
function classifyLevel(gradeLevel) {
  if (gradeLevel < 6) return 'Elementary';
  if (gradeLevel < 9) return 'Middle School';
  if (gradeLevel < 13) return 'High School';
  if (gradeLevel < 17) return 'College';
  return 'Graduate';
}

/**
 * Analyze academic text and return comprehensive metrics.
 * @param {string} text
 * @returns {{
 *   wordCount: number,
 *   charCount: number,
 *   sentenceCount: number,
 *   paragraphCount: number,
 *   pagesDoubleSpaced: number,
 *   pagesSingleSpaced: number,
 *   speakingTimeMinutes: number,
 *   readability: {
 *     fleschKincaid: number,
 *     fleschReadingEase: number,
 *     gunningFog: number,
 *     colemanLiau: number,
 *     level: string
 *   }
 * }}
 */
export function analyzeAcademicText(text) {
  if (!text || !text.trim()) {
    return {
      wordCount: 0,
      charCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      pagesDoubleSpaced: 0,
      pagesSingleSpaced: 0,
      speakingTimeMinutes: 0,
      readability: {
        fleschKincaid: 0,
        fleschReadingEase: 0,
        gunningFog: 0,
        colemanLiau: 0,
        level: 'Elementary',
      },
    };
  }

  const charCount = text.length;

  // Words: split on whitespace, filter empties
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Sentences: split on .!?
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  // Paragraphs: split on double newlines
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = Math.max(paragraphs.length, 1);

  // Page estimates
  const pagesDoubleSpaced = Math.round((wordCount / 250) * 100) / 100;
  const pagesSingleSpaced = Math.round((wordCount / 500) * 100) / 100;

  // Speaking time at 130 wpm
  const speakingTimeMinutes = Math.round((wordCount / 130) * 100) / 100;

  // Syllable counts
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const complexWords = words.filter(w => countSyllables(w) >= 3).length;

  // Letter count (only letters)
  const letterCount = text.replace(/[^a-zA-Z]/g, '').length;

  // Readability formulas (guard against division by zero)
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;

  // Flesch-Kincaid Grade Level
  const fleschKincaid = wordCount > 0
    ? Math.round((0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59) * 10) / 10
    : 0;

  // Flesch Reading Ease
  const fleschReadingEase = wordCount > 0
    ? Math.round((206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord) * 10) / 10
    : 0;

  // Gunning Fog Index
  const complexWordPercent = wordCount > 0 ? complexWords / wordCount : 0;
  const gunningFog = wordCount > 0
    ? Math.round((0.4 * (avgWordsPerSentence + 100 * complexWordPercent)) * 10) / 10
    : 0;

  // Coleman-Liau Index
  const L = wordCount > 0 ? (letterCount / wordCount) * 100 : 0;
  const S = wordCount > 0 ? (sentenceCount / wordCount) * 100 : 0;
  const colemanLiau = wordCount > 0
    ? Math.round((0.0588 * L - 0.296 * S - 15.8) * 10) / 10
    : 0;

  const level = classifyLevel(fleschKincaid);

  return {
    wordCount,
    charCount,
    sentenceCount,
    paragraphCount,
    pagesDoubleSpaced,
    pagesSingleSpaced,
    speakingTimeMinutes,
    readability: {
      fleschKincaid,
      fleschReadingEase,
      gunningFog,
      colemanLiau,
      level,
    },
  };
}
