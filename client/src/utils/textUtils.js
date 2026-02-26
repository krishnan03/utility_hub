// ============================================================
// Case Conversion
// ============================================================

export function toUpperCase(text) {
  return text.toUpperCase();
}

export function toLowerCase(text) {
  return text.toLowerCase();
}

export function toTitleCase(text) {
  return text.replace(/\S+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

export function toSentenceCase(text) {
  return text
    .toLowerCase()
    .replace(/(^\s*|[.!?]\s+)(\w)/g, (match, separator, char) =>
      separator + char.toUpperCase()
    );
}

export function toCamelCase(text) {
  return text
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

export function toSnakeCase(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

export function toKebabCase(text) {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}


// ============================================================
// Text Metrics
// ============================================================

export function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export function countCharacters(text) {
  return text.length;
}

export function countSentences(text) {
  if (!text || !text.trim()) return 0;
  const matches = text.match(/[^.!?]*[.!?]+/g);
  return matches ? matches.length : 0;
}

export function estimateReadingTime(text) {
  const words = countWords(text);
  return Math.ceil(words / 200);
}

// ============================================================
// Encoding / Decoding
// ============================================================

export function encodeBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

export function decodeBase64(text) {
  return decodeURIComponent(escape(atob(text)));
}

export function encodeUrl(text) {
  return encodeURIComponent(text);
}

export function decodeUrl(text) {
  return decodeURIComponent(text);
}

const HTML_ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const REVERSE_HTML_ENTITY_MAP = Object.fromEntries(
  Object.entries(HTML_ENTITY_MAP).map(([k, v]) => [v, k])
);

export function encodeHtmlEntities(text) {
  return text.replace(/[&<>"']/g, (char) => HTML_ENTITY_MAP[char]);
}

export function decodeHtmlEntities(text) {
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => REVERSE_HTML_ENTITY_MAP[entity]);
}

// ============================================================
// Hash Generation (Web Crypto API + MD5 fallback)
// ============================================================

function md5(string) {
  function rotateLeft(val, shift) {
    return (val << shift) | (val >>> (32 - shift));
  }

  function addUnsigned(x, y) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }

  function F(x, y, z) { return (x & y) | (~x & z); }
  function G(x, y, z) { return (x & z) | (y & ~z); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | ~z); }

  function transform(func, a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(func(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function toWordArray(str) {
    const len = str.length;
    const numWords = ((len + 8) >>> 6) + 1;
    const words = new Array(numWords * 16).fill(0);
    for (let i = 0; i < len; i++) {
      words[i >>> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    }
    words[len >>> 2] |= 0x80 << ((len % 4) * 8);
    words[numWords * 16 - 2] = len * 8;
    return words;
  }

  function toHex(value) {
    let hex = '';
    for (let i = 0; i < 4; i++) {
      const byte = (value >>> (i * 8)) & 0xff;
      hex += ('0' + byte.toString(16)).slice(-2);
    }
    return hex;
  }

  const utf8Str = unescape(encodeURIComponent(string));
  const x = toWordArray(utf8Str);

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

  const S = [
    [7, 12, 17, 22], [5, 9, 14, 20], [4, 11, 16, 23], [6, 10, 15, 21]
  ];
  const T = [];
  for (let i = 1; i <= 64; i++) {
    T.push(Math.floor(Math.abs(Math.sin(i)) * 0x100000000));
  }

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;

    // Round 1
    a = transform(F, a, b, c, d, x[k + 0], S[0][0], T[0]);
    d = transform(F, d, a, b, c, x[k + 1], S[0][1], T[1]);
    c = transform(F, c, d, a, b, x[k + 2], S[0][2], T[2]);
    b = transform(F, b, c, d, a, x[k + 3], S[0][3], T[3]);
    a = transform(F, a, b, c, d, x[k + 4], S[0][0], T[4]);
    d = transform(F, d, a, b, c, x[k + 5], S[0][1], T[5]);
    c = transform(F, c, d, a, b, x[k + 6], S[0][2], T[6]);
    b = transform(F, b, c, d, a, x[k + 7], S[0][3], T[7]);
    a = transform(F, a, b, c, d, x[k + 8], S[0][0], T[8]);
    d = transform(F, d, a, b, c, x[k + 9], S[0][1], T[9]);
    c = transform(F, c, d, a, b, x[k + 10], S[0][2], T[10]);
    b = transform(F, b, c, d, a, x[k + 11], S[0][3], T[11]);
    a = transform(F, a, b, c, d, x[k + 12], S[0][0], T[12]);
    d = transform(F, d, a, b, c, x[k + 13], S[0][1], T[13]);
    c = transform(F, c, d, a, b, x[k + 14], S[0][2], T[14]);
    b = transform(F, b, c, d, a, x[k + 15], S[0][3], T[15]);

    // Round 2
    a = transform(G, a, b, c, d, x[k + 1], S[1][0], T[16]);
    d = transform(G, d, a, b, c, x[k + 6], S[1][1], T[17]);
    c = transform(G, c, d, a, b, x[k + 11], S[1][2], T[18]);
    b = transform(G, b, c, d, a, x[k + 0], S[1][3], T[19]);
    a = transform(G, a, b, c, d, x[k + 5], S[1][0], T[20]);
    d = transform(G, d, a, b, c, x[k + 10], S[1][1], T[21]);
    c = transform(G, c, d, a, b, x[k + 15], S[1][2], T[22]);
    b = transform(G, b, c, d, a, x[k + 4], S[1][3], T[23]);
    a = transform(G, a, b, c, d, x[k + 9], S[1][0], T[24]);
    d = transform(G, d, a, b, c, x[k + 14], S[1][1], T[25]);
    c = transform(G, c, d, a, b, x[k + 3], S[1][2], T[26]);
    b = transform(G, b, c, d, a, x[k + 8], S[1][3], T[27]);
    a = transform(G, a, b, c, d, x[k + 13], S[1][0], T[28]);
    d = transform(G, d, a, b, c, x[k + 2], S[1][1], T[29]);
    c = transform(G, c, d, a, b, x[k + 7], S[1][2], T[30]);
    b = transform(G, b, c, d, a, x[k + 12], S[1][3], T[31]);

    // Round 3
    a = transform(H, a, b, c, d, x[k + 5], S[2][0], T[32]);
    d = transform(H, d, a, b, c, x[k + 8], S[2][1], T[33]);
    c = transform(H, c, d, a, b, x[k + 11], S[2][2], T[34]);
    b = transform(H, b, c, d, a, x[k + 14], S[2][3], T[35]);
    a = transform(H, a, b, c, d, x[k + 1], S[2][0], T[36]);
    d = transform(H, d, a, b, c, x[k + 4], S[2][1], T[37]);
    c = transform(H, c, d, a, b, x[k + 7], S[2][2], T[38]);
    b = transform(H, b, c, d, a, x[k + 10], S[2][3], T[39]);
    a = transform(H, a, b, c, d, x[k + 13], S[2][0], T[40]);
    d = transform(H, d, a, b, c, x[k + 0], S[2][1], T[41]);
    c = transform(H, c, d, a, b, x[k + 3], S[2][2], T[42]);
    b = transform(H, b, c, d, a, x[k + 6], S[2][3], T[43]);
    a = transform(H, a, b, c, d, x[k + 9], S[2][0], T[44]);
    d = transform(H, d, a, b, c, x[k + 12], S[2][1], T[45]);
    c = transform(H, c, d, a, b, x[k + 15], S[2][2], T[46]);
    b = transform(H, b, c, d, a, x[k + 2], S[2][3], T[47]);

    // Round 4
    a = transform(I, a, b, c, d, x[k + 0], S[3][0], T[48]);
    d = transform(I, d, a, b, c, x[k + 7], S[3][1], T[49]);
    c = transform(I, c, d, a, b, x[k + 14], S[3][2], T[50]);
    b = transform(I, b, c, d, a, x[k + 5], S[3][3], T[51]);
    a = transform(I, a, b, c, d, x[k + 12], S[3][0], T[52]);
    d = transform(I, d, a, b, c, x[k + 3], S[3][1], T[53]);
    c = transform(I, c, d, a, b, x[k + 10], S[3][2], T[54]);
    b = transform(I, b, c, d, a, x[k + 1], S[3][3], T[55]);
    a = transform(I, a, b, c, d, x[k + 8], S[3][0], T[56]);
    d = transform(I, d, a, b, c, x[k + 15], S[3][1], T[57]);
    c = transform(I, c, d, a, b, x[k + 6], S[3][2], T[58]);
    b = transform(I, b, c, d, a, x[k + 13], S[3][3], T[59]);
    a = transform(I, a, b, c, d, x[k + 4], S[3][0], T[60]);
    d = transform(I, d, a, b, c, x[k + 11], S[3][1], T[61]);
    c = transform(I, c, d, a, b, x[k + 2], S[3][2], T[62]);
    b = transform(I, b, c, d, a, x[k + 9], S[3][3], T[63]);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

export async function generateHash(text, algorithm) {
  const upper = algorithm.toUpperCase();

  if (upper === 'MD5') {
    return md5(text);
  }

  const algoMap = {
    'SHA-1': 'SHA-1',
    'SHA-256': 'SHA-256',
    'SHA-512': 'SHA-512',
  };

  const cryptoAlgo = algoMap[upper];
  if (!cryptoAlgo) {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(cryptoAlgo, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// Text Diff (line-by-line)
// ============================================================

export function diffTexts(text1, text2) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const result = [];

  const maxLen = Math.max(lines1.length, lines2.length);

  let i = 0;
  let j = 0;

  while (i < lines1.length || j < lines2.length) {
    if (i < lines1.length && j < lines2.length) {
      if (lines1[i] === lines2[j]) {
        result.push({ type: 'equal', value: lines1[i] });
        i++;
        j++;
      } else {
        // Look ahead to find if lines1[i] appears later in lines2
        let foundInLines2 = -1;
        for (let k = j + 1; k < Math.min(j + 5, lines2.length); k++) {
          if (lines1[i] === lines2[k]) {
            foundInLines2 = k;
            break;
          }
        }

        let foundInLines1 = -1;
        for (let k = i + 1; k < Math.min(i + 5, lines1.length); k++) {
          if (lines2[j] === lines1[k]) {
            foundInLines1 = k;
            break;
          }
        }

        if (foundInLines2 !== -1 && (foundInLines1 === -1 || foundInLines2 - j <= foundInLines1 - i)) {
          // Lines were added in text2
          while (j < foundInLines2) {
            result.push({ type: 'add', value: lines2[j] });
            j++;
          }
        } else if (foundInLines1 !== -1) {
          // Lines were removed from text1
          while (i < foundInLines1) {
            result.push({ type: 'remove', value: lines1[i] });
            i++;
          }
        } else {
          result.push({ type: 'remove', value: lines1[i] });
          result.push({ type: 'add', value: lines2[j] });
          i++;
          j++;
        }
      }
    } else if (i < lines1.length) {
      result.push({ type: 'remove', value: lines1[i] });
      i++;
    } else {
      result.push({ type: 'add', value: lines2[j] });
      j++;
    }
  }

  return result;
}

// ============================================================
// Lorem Ipsum Generator
// ============================================================

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
  'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
  'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
  'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum',
];

const FIRST_SENTENCE = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

function generateSentence(wordCount) {
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]);
  }
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(' ') + '.';
}

function generateParagraph(sentenceCount) {
  const sentences = [];
  for (let i = 0; i < sentenceCount; i++) {
    const wordCount = 8 + Math.floor(Math.random() * 10);
    sentences.push(generateSentence(wordCount));
  }
  return sentences.join(' ');
}

export function generateLoremIpsum(paragraphs) {
  const count = Math.max(1, Math.floor(paragraphs));
  const result = [];

  for (let i = 0; i < count; i++) {
    const sentenceCount = 4 + Math.floor(Math.random() * 4);
    let paragraph = generateParagraph(sentenceCount);
    if (i === 0) {
      paragraph = FIRST_SENTENCE + ' ' + paragraph;
    }
    result.push(paragraph);
  }

  return result.join('\n\n');
}

// ============================================================
// Find and Replace
// ============================================================

export function findAndReplace(text, find, replace, options = {}) {
  const { regex = false, caseSensitive = true, global = true } = options;

  if (!find) {
    return { result: text, count: 0 };
  }

  let flags = '';
  if (global) flags += 'g';
  if (!caseSensitive) flags += 'i';

  let pattern;
  if (regex) {
    pattern = new RegExp(find, flags);
  } else {
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern = new RegExp(escaped, flags);
  }

  let count = 0;
  const result = text.replace(pattern, (match) => {
    count++;
    return replace;
  });

  return { result, count };
}

// ============================================================
// Readability Scoring
// ============================================================

/**
 * Count syllables in a word (English approximation).
 */
export function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

/**
 * Count total syllables in text.
 */
export function countTotalSyllables(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.reduce((sum, w) => sum + countSyllables(w), 0);
}

/**
 * Flesch Reading Ease score (0-100, higher = easier).
 */
export function fleschReadingEase(text) {
  const words = countWords(text);
  const sentences = countSentences(text) || 1;
  const syllables = countTotalSyllables(text);
  if (!words) return 0;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

/**
 * Flesch-Kincaid Grade Level.
 */
export function fleschKincaidGrade(text) {
  const words = countWords(text);
  const sentences = countSentences(text) || 1;
  const syllables = countTotalSyllables(text);
  if (!words) return 0;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

/**
 * Gunning Fog Index.
 */
export function gunningFogIndex(text) {
  const words = countWords(text);
  const sentences = countSentences(text) || 1;
  const wordList = text.trim().split(/\s+/).filter(Boolean);
  const complexWords = wordList.filter(w => countSyllables(w) >= 3).length;
  if (!words) return 0;
  return 0.4 * ((words / sentences) + 100 * (complexWords / words));
}

/**
 * Coleman-Liau Index.
 */
export function colemanLiauIndex(text) {
  const words = countWords(text);
  const sentences = countSentences(text) || 1;
  const chars = text.replace(/\s/g, '').length;
  if (!words) return 0;
  const L = (chars / words) * 100;
  const S = (sentences / words) * 100;
  return 0.0588 * L - 0.296 * S - 15.8;
}

/**
 * Automated Readability Index.
 */
export function automatedReadabilityIndex(text) {
  const words = countWords(text);
  const sentences = countSentences(text) || 1;
  const chars = text.replace(/\s/g, '').length;
  if (!words) return 0;
  return 4.71 * (chars / words) + 0.5 * (words / sentences) - 21.43;
}

/**
 * SMOG Index.
 */
export function smogIndex(text) {
  const sentences = countSentences(text) || 1;
  const wordList = text.trim().split(/\s+/).filter(Boolean);
  const polysyllables = wordList.filter(w => countSyllables(w) >= 3).length;
  return 1.0430 * Math.sqrt(polysyllables * (30 / sentences)) + 3.1291;
}

/**
 * Get readability grade label from grade level number.
 */
export function gradeLabel(grade) {
  if (grade <= 1) return '1st Grade';
  if (grade <= 5) return `${Math.round(grade)}th Grade`;
  if (grade <= 8) return `${Math.round(grade)}th Grade (Middle School)`;
  if (grade <= 12) return `${Math.round(grade)}th Grade (High School)`;
  if (grade <= 16) return 'College Level';
  return 'Graduate Level';
}

/**
 * Get Flesch Reading Ease label.
 */
export function fleschLabel(score) {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

/**
 * Get color for Flesch score (for UI).
 */
export function fleschColor(score) {
  if (score >= 70) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}
