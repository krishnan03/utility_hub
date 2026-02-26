import { describe, it, expect } from 'vitest';
import {
  toUpperCase, toLowerCase, toTitleCase, toSentenceCase,
  toCamelCase, toSnakeCase, toKebabCase,
  countWords, countCharacters, countSentences, estimateReadingTime,
  encodeBase64, decodeBase64, encodeUrl, decodeUrl,
  encodeHtmlEntities, decodeHtmlEntities,
  generateHash,
  diffTexts,
  generateLoremIpsum,
  findAndReplace,
} from './textUtils.js';

// ============================================================
// Case Conversion
// ============================================================

describe('Case Conversion', () => {
  describe('toUpperCase', () => {
    it('converts text to uppercase', () => {
      expect(toUpperCase('hello world')).toBe('HELLO WORLD');
    });
    it('handles empty string', () => {
      expect(toUpperCase('')).toBe('');
    });
    it('handles already uppercase', () => {
      expect(toUpperCase('ABC')).toBe('ABC');
    });
  });

  describe('toLowerCase', () => {
    it('converts text to lowercase', () => {
      expect(toLowerCase('HELLO WORLD')).toBe('hello world');
    });
    it('handles empty string', () => {
      expect(toLowerCase('')).toBe('');
    });
  });

  describe('toTitleCase', () => {
    it('capitalizes first letter of each word', () => {
      expect(toTitleCase('hello world foo')).toBe('Hello World Foo');
    });
    it('handles single word', () => {
      expect(toTitleCase('hello')).toBe('Hello');
    });
    it('handles mixed case input', () => {
      expect(toTitleCase('hELLO wORLD')).toBe('Hello World');
    });
    it('handles empty string', () => {
      expect(toTitleCase('')).toBe('');
    });
  });

  describe('toSentenceCase', () => {
    it('capitalizes first letter of each sentence', () => {
      expect(toSentenceCase('hello world. foo bar.')).toBe('Hello world. Foo bar.');
    });
    it('handles single sentence', () => {
      expect(toSentenceCase('hello world')).toBe('Hello world');
    });
    it('handles empty string', () => {
      expect(toSentenceCase('')).toBe('');
    });
  });

  describe('toCamelCase', () => {
    it('converts space-separated words', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
    });
    it('converts hyphenated words', () => {
      expect(toCamelCase('hello-world-foo')).toBe('helloWorldFoo');
    });
    it('converts underscored words', () => {
      expect(toCamelCase('hello_world')).toBe('helloWorld');
    });
    it('handles single word', () => {
      expect(toCamelCase('hello')).toBe('hello');
    });
  });

  describe('toSnakeCase', () => {
    it('converts space-separated words', () => {
      expect(toSnakeCase('hello world')).toBe('hello_world');
    });
    it('converts camelCase', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world');
    });
    it('converts hyphenated words', () => {
      expect(toSnakeCase('hello-world')).toBe('hello_world');
    });
    it('handles single word', () => {
      expect(toSnakeCase('hello')).toBe('hello');
    });
  });

  describe('toKebabCase', () => {
    it('converts space-separated words', () => {
      expect(toKebabCase('hello world')).toBe('hello-world');
    });
    it('converts camelCase', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
    });
    it('converts underscored words', () => {
      expect(toKebabCase('hello_world')).toBe('hello-world');
    });
    it('handles single word', () => {
      expect(toKebabCase('hello')).toBe('hello');
    });
  });
});

// ============================================================
// Text Metrics
// ============================================================

describe('Text Metrics', () => {
  describe('countWords', () => {
    it('counts words in a sentence', () => {
      expect(countWords('hello world foo')).toBe(3);
    });
    it('returns 0 for empty string', () => {
      expect(countWords('')).toBe(0);
    });
    it('returns 0 for whitespace only', () => {
      expect(countWords('   ')).toBe(0);
    });
    it('handles multiple spaces between words', () => {
      expect(countWords('hello   world')).toBe(2);
    });
  });

  describe('countCharacters', () => {
    it('counts all characters including spaces', () => {
      expect(countCharacters('hello world')).toBe(11);
    });
    it('returns 0 for empty string', () => {
      expect(countCharacters('')).toBe(0);
    });
  });

  describe('countSentences', () => {
    it('counts sentences ending with period', () => {
      expect(countSentences('Hello. World.')).toBe(2);
    });
    it('counts sentences ending with different punctuation', () => {
      expect(countSentences('Hello! How are you? Fine.')).toBe(3);
    });
    it('returns 0 for empty string', () => {
      expect(countSentences('')).toBe(0);
    });
    it('returns 0 for text without sentence-ending punctuation', () => {
      expect(countSentences('hello world')).toBe(0);
    });
  });

  describe('estimateReadingTime', () => {
    it('estimates 1 minute for short text', () => {
      expect(estimateReadingTime('hello world')).toBe(1);
    });
    it('estimates correctly for 200 words', () => {
      const words = Array(200).fill('word').join(' ');
      expect(estimateReadingTime(words)).toBe(1);
    });
    it('estimates correctly for 400 words', () => {
      const words = Array(400).fill('word').join(' ');
      expect(estimateReadingTime(words)).toBe(2);
    });
    it('returns 0 for empty string', () => {
      expect(estimateReadingTime('')).toBe(0);
    });
  });
});

// ============================================================
// Encoding / Decoding
// ============================================================

describe('Encoding / Decoding', () => {
  describe('Base64', () => {
    it('encodes and decodes round-trip', () => {
      const text = 'Hello, World!';
      expect(decodeBase64(encodeBase64(text))).toBe(text);
    });
    it('encodes known value', () => {
      expect(encodeBase64('Hello')).toBe('SGVsbG8=');
    });
    it('handles unicode characters', () => {
      const text = 'Héllo Wörld 🌍';
      expect(decodeBase64(encodeBase64(text))).toBe(text);
    });
    it('handles empty string', () => {
      expect(encodeBase64('')).toBe('');
      expect(decodeBase64('')).toBe('');
    });
  });

  describe('URL encoding', () => {
    it('encodes special characters', () => {
      expect(encodeUrl('hello world&foo=bar')).toBe('hello%20world%26foo%3Dbar');
    });
    it('decodes encoded string', () => {
      expect(decodeUrl('hello%20world')).toBe('hello world');
    });
    it('round-trips correctly', () => {
      const text = 'key=value&other=test param';
      expect(decodeUrl(encodeUrl(text))).toBe(text);
    });
  });

  describe('HTML entities', () => {
    it('encodes HTML special characters', () => {
      expect(encodeHtmlEntities('<div class="test">')).toBe('&lt;div class=&quot;test&quot;&gt;');
    });
    it('encodes ampersand', () => {
      expect(encodeHtmlEntities('a & b')).toBe('a &amp; b');
    });
    it('decodes HTML entities', () => {
      expect(decodeHtmlEntities('&lt;div&gt;')).toBe('<div>');
    });
    it('round-trips correctly', () => {
      const text = '<p class="test">Hello & "World"</p>';
      expect(decodeHtmlEntities(encodeHtmlEntities(text))).toBe(text);
    });
    it('handles single quotes', () => {
      expect(encodeHtmlEntities("it's")).toBe("it&#39;s");
      expect(decodeHtmlEntities("it&#39;s")).toBe("it's");
    });
  });
});

// ============================================================
// Hash Generation
// ============================================================

describe('Hash Generation', () => {
  it('generates MD5 hash', async () => {
    const hash = await generateHash('hello', 'MD5');
    expect(hash).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('generates SHA-1 hash', async () => {
    const hash = await generateHash('hello', 'SHA-1');
    expect(hash).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
  });

  it('generates SHA-256 hash', async () => {
    const hash = await generateHash('hello', 'SHA-256');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('generates SHA-512 hash', async () => {
    const hash = await generateHash('hello', 'SHA-512');
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it('returns consistent hashes for same input', async () => {
    const hash1 = await generateHash('test', 'SHA-256');
    const hash2 = await generateHash('test', 'SHA-256');
    expect(hash1).toBe(hash2);
  });

  it('returns different hashes for different inputs', async () => {
    const hash1 = await generateHash('hello', 'SHA-256');
    const hash2 = await generateHash('world', 'SHA-256');
    expect(hash1).not.toBe(hash2);
  });

  it('throws for unsupported algorithm', async () => {
    await expect(generateHash('hello', 'UNSUPPORTED')).rejects.toThrow('Unsupported algorithm');
  });

  it('handles empty string', async () => {
    const hash = await generateHash('', 'MD5');
    expect(hash).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });
});


// ============================================================
// Text Diff
// ============================================================

describe('diffTexts', () => {
  it('returns equal for identical texts', () => {
    const result = diffTexts('hello\nworld', 'hello\nworld');
    expect(result).toEqual([
      { type: 'equal', value: 'hello' },
      { type: 'equal', value: 'world' },
    ]);
  });

  it('detects added lines', () => {
    const result = diffTexts('hello', 'hello\nworld');
    expect(result).toEqual([
      { type: 'equal', value: 'hello' },
      { type: 'add', value: 'world' },
    ]);
  });

  it('detects removed lines', () => {
    const result = diffTexts('hello\nworld', 'hello');
    expect(result).toEqual([
      { type: 'equal', value: 'hello' },
      { type: 'remove', value: 'world' },
    ]);
  });

  it('detects modified lines', () => {
    const result = diffTexts('hello\nworld', 'hello\nearth');
    expect(result).toEqual([
      { type: 'equal', value: 'hello' },
      { type: 'remove', value: 'world' },
      { type: 'add', value: 'earth' },
    ]);
  });

  it('handles empty inputs', () => {
    const result = diffTexts('', '');
    expect(result).toEqual([{ type: 'equal', value: '' }]);
  });

  it('handles first text empty', () => {
    const result = diffTexts('', 'hello');
    expect(result).toEqual([
      { type: 'remove', value: '' },
      { type: 'add', value: 'hello' },
    ]);
  });

  it('handles second text empty', () => {
    const result = diffTexts('hello', '');
    expect(result).toEqual([
      { type: 'remove', value: 'hello' },
      { type: 'add', value: '' },
    ]);
  });
});

// ============================================================
// Lorem Ipsum
// ============================================================

describe('generateLoremIpsum', () => {
  it('generates specified number of paragraphs', () => {
    const result = generateLoremIpsum(3);
    const paragraphs = result.split('\n\n');
    expect(paragraphs).toHaveLength(3);
  });

  it('starts with "Lorem ipsum"', () => {
    const result = generateLoremIpsum(1);
    expect(result.startsWith('Lorem ipsum')).toBe(true);
  });

  it('generates at least 1 paragraph for 0 or negative input', () => {
    const result = generateLoremIpsum(0);
    const paragraphs = result.split('\n\n');
    expect(paragraphs.length).toBeGreaterThanOrEqual(1);
  });

  it('generates non-empty paragraphs', () => {
    const result = generateLoremIpsum(5);
    const paragraphs = result.split('\n\n');
    paragraphs.forEach((p) => {
      expect(p.length).toBeGreaterThan(0);
    });
  });

  it('generates single paragraph', () => {
    const result = generateLoremIpsum(1);
    const paragraphs = result.split('\n\n');
    expect(paragraphs).toHaveLength(1);
  });
});

// ============================================================
// Find and Replace
// ============================================================

describe('findAndReplace', () => {
  it('replaces all occurrences by default', () => {
    const { result, count } = findAndReplace('hello world hello', 'hello', 'hi');
    expect(result).toBe('hi world hi');
    expect(count).toBe(2);
  });

  it('replaces first occurrence when global is false', () => {
    const { result, count } = findAndReplace('hello world hello', 'hello', 'hi', { global: false });
    expect(result).toBe('hi world hello');
    expect(count).toBe(1);
  });

  it('handles case-insensitive replacement', () => {
    const { result, count } = findAndReplace('Hello HELLO hello', 'hello', 'hi', { caseSensitive: false });
    expect(result).toBe('hi hi hi');
    expect(count).toBe(3);
  });

  it('handles regex patterns', () => {
    const { result, count } = findAndReplace('foo123bar456', '\\d+', 'NUM', { regex: true });
    expect(result).toBe('fooNUMbarNUM');
    expect(count).toBe(2);
  });

  it('escapes special regex characters in non-regex mode', () => {
    const { result, count } = findAndReplace('price is $10.00', '$10.00', '$20.00');
    expect(result).toBe('price is $20.00');
    expect(count).toBe(1);
  });

  it('returns original text and count 0 when find is empty', () => {
    const { result, count } = findAndReplace('hello', '', 'world');
    expect(result).toBe('hello');
    expect(count).toBe(0);
  });

  it('returns original text when no match found', () => {
    const { result, count } = findAndReplace('hello world', 'xyz', 'abc');
    expect(result).toBe('hello world');
    expect(count).toBe(0);
  });

  it('handles replacement with empty string', () => {
    const { result, count } = findAndReplace('hello world', 'world', '');
    expect(result).toBe('hello ');
    expect(count).toBe(1);
  });
});
