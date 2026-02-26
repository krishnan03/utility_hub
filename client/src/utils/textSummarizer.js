/**
 * Extractive Text Summarization
 * Pure client-side — no server calls.
 */

const MIN_INPUT_LENGTH = 100;
const MAX_INPUT_LENGTH = 50000;

const LENGTH_RATIOS = {
  short: 0.25,
  medium: 0.50,
  long: 0.75,
};

/**
 * Split text into sentences using common punctuation boundaries.
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]+[\s]*/g);
  if (!raw) return [text.trim()];
  return raw.map(s => s.trim()).filter(Boolean);
}

/**
 * Build a word-frequency map from the text (lowercased, ignoring short words).
 * @param {string} text
 * @returns {Map<string, number>}
 */
function buildFrequencyMap(text) {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = new Map();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return freq;
}

/**
 * Score a sentence based on position, word frequency, and length.
 * @param {string} sentence
 * @param {number} index
 * @param {number} totalSentences
 * @param {Map<string, number>} freqMap
 * @returns {number}
 */
function scoreSentence(sentence, index, totalSentences, freqMap) {
  let score = 0;

  // Position bonus: first and last sentences are more important
  if (index === 0) score += 2;
  else if (index === totalSentences - 1) score += 1.5;
  else if (index <= 2) score += 1;

  // Word frequency score
  const words = sentence.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  if (words.length > 0) {
    const freqScore = words.reduce((sum, w) => sum + (freqMap.get(w) || 0), 0);
    score += freqScore / words.length;
  }

  // Length bonus: prefer medium-length sentences (not too short, not too long)
  const wordCount = sentence.split(/\s+/).length;
  if (wordCount >= 8 && wordCount <= 30) score += 1;
  else if (wordCount < 5) score -= 0.5;

  return score;
}

/**
 * Summarize text using extractive summarization.
 * @param {string} text - Input text (100–50000 chars)
 * @param {'short'|'medium'|'long'} length - Target summary length
 * @returns {{ summary: string, originalLength: number, summaryLength: number }}
 */
export function summarize(text, length = 'medium') {
  if (!text || typeof text !== 'string') {
    throw new Error('Input text is required');
  }

  const trimmed = text.trim();

  if (trimmed.length < MIN_INPUT_LENGTH) {
    throw new Error(`Input must be at least ${MIN_INPUT_LENGTH} characters (got ${trimmed.length})`);
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    throw new Error(`Input must be at most ${MAX_INPUT_LENGTH} characters (got ${trimmed.length})`);
  }

  const ratio = LENGTH_RATIOS[length];
  if (ratio === undefined) {
    throw new Error(`Invalid length: ${length}. Use 'short', 'medium', or 'long'`);
  }

  const sentences = splitSentences(trimmed);
  if (sentences.length <= 1) {
    return { summary: trimmed, originalLength: trimmed.length, summaryLength: trimmed.length };
  }

  const freqMap = buildFrequencyMap(trimmed);

  // Score each sentence
  const scored = sentences.map((sentence, i) => ({
    sentence,
    index: i,
    score: scoreSentence(sentence, i, sentences.length, freqMap),
  }));

  // Determine how many sentences to keep
  const targetCount = Math.max(1, Math.round(sentences.length * ratio));

  // Select top-scoring sentences
  const selected = [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)
    .sort((a, b) => a.index - b.index); // restore original order

  const summary = selected.map(s => s.sentence).join(' ');

  return {
    summary,
    originalLength: trimmed.length,
    summaryLength: summary.length,
  };
}
