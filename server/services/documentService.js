import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProcessingError, ValidationError } from '../utils/errors.js';
import { ensureDir, getOutputDir } from '../utils/fileHelpers.js';

/**
 * Supported source formats (detected from file extension).
 */
const SUPPORTED_EXTENSIONS = ['.md', '.markdown', '.html', '.htm', '.txt', '.csv'];

/**
 * Supported target formats.
 */
const SUPPORTED_TARGETS = ['md', 'html', 'txt', 'csv'];

/**
 * MIME types for output formats.
 */
const MIME_MAP = {
  md: 'text/markdown',
  html: 'text/html',
  txt: 'text/plain',
  csv: 'text/csv',
};

/**
 * Detect the source format from a file extension.
 * @param {string} filePath
 * @returns {string} Normalized format key: 'md', 'html', 'txt', 'csv'
 */
function detectFormat(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.md':
    case '.markdown':
      return 'md';
    case '.html':
    case '.htm':
      return 'html';
    case '.txt':
      return 'txt';
    case '.csv':
      return 'csv';
    default:
      return null;
  }
}

/**
 * Convert Markdown text to HTML.
 * Handles: headings, bold, italic, links, images, code blocks, inline code,
 * unordered lists, ordered lists, horizontal rules, blockquotes, paragraphs.
 *
 * @param {string} md - Markdown source
 * @returns {string} HTML output
 */
export function markdownToHtml(md) {
  let html = md;

  // Fenced code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    const escaped = escapeHtml(code.trimEnd());
    return lang
      ? `<pre><code class="language-${lang}">${escaped}</code></pre>`
      : `<pre><code>${escaped}</code></pre>`;
  });

  // Blockquotes (> lines)
  html = html.replace(/^(>{1})\s?(.+)$/gm, '<blockquote>$2</blockquote>');
  // Merge adjacent blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Headings (# through ######)
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr>');

  // Images ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic *text* or _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Unordered lists (- or * at start of line)
  html = html.replace(/^(?:[-*])\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>\n$1</ul>\n');

  // Ordered lists (1. 2. etc.)
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> that aren't already in <ul> into <ol>
  html = html.replace(/(?:^|\n)((?:<li>.*<\/li>\n?)+)/g, (match) => {
    // Only wrap if not already inside <ul>
    if (match.includes('<ul>')) return match;
    return match.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ol>\n$1</ol>\n');
  });

  // Paragraphs: wrap remaining non-empty, non-tag lines
  const lines = html.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line === '' ||
      line.startsWith('<h') ||
      line.startsWith('<ul') ||
      line.startsWith('<ol') ||
      line.startsWith('<li') ||
      line.startsWith('</ul') ||
      line.startsWith('</ol') ||
      line.startsWith('<pre') ||
      line.startsWith('<hr') ||
      line.startsWith('<blockquote') ||
      line.startsWith('</blockquote')
    ) {
      result.push(lines[i]);
    } else {
      result.push(`<p>${line}</p>`);
    }
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Convert HTML to Markdown.
 * Handles: headings, bold, italic, links, images, code blocks, inline code,
 * lists, horizontal rules, blockquotes, paragraphs.
 *
 * @param {string} html - HTML source
 * @returns {string} Markdown output
 */
export function htmlToMarkdown(html) {
  let md = html;

  // Code blocks
  md = md.replace(/<pre><code(?:\s+class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g, (_m, lang, code) => {
    const unescaped = unescapeHtml(code);
    return lang ? `\`\`\`${lang}\n${unescaped}\n\`\`\`` : `\`\`\`\n${unescaped}\n\`\`\``;
  });

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1');

  // Horizontal rules
  md = md.replace(/<hr\s*\/?>/gi, '---');

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, content) => {
    return content.trim().split('\n').map((line) => `> ${line.trim()}`).join('\n');
  });

  // Images
  md = md.replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]+alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)');

  // Links
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Bold
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');

  // Italic
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // Inline code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // List items
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1');

  // Remove list wrappers
  md = md.replace(/<\/?(?:ul|ol)[^>]*>/gi, '');

  // Paragraphs — unwrap
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1');

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Strip remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Unescape HTML entities
  md = unescapeHtml(md);

  // Clean up excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

/**
 * Strip all formatting from text (HTML tags, Markdown syntax).
 * @param {string} content - Source content
 * @param {string} sourceFormat - 'md', 'html', 'csv', or 'txt'
 * @returns {string} Plain text
 */
export function toPlainText(content, sourceFormat) {
  if (sourceFormat === 'txt') return content;

  if (sourceFormat === 'html') {
    let text = content;
    // Convert <br> to newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Convert block elements to newlines
    text = text.replace(/<\/(?:p|div|h[1-6]|li|blockquote|pre)>/gi, '\n');
    // Strip all tags
    text = text.replace(/<[^>]+>/g, '');
    text = unescapeHtml(text);
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  if (sourceFormat === 'md') {
    // Convert to HTML first, then strip tags
    const html = markdownToHtml(content);
    return toPlainText(html, 'html');
  }

  if (sourceFormat === 'csv') {
    return content; // CSV is already plain text
  }

  return content;
}

/**
 * Convert CSV content to an HTML table.
 * @param {string} csv - CSV source
 * @returns {string} HTML table
 */
export function csvToHtml(csv) {
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    return '<table></table>';
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  let html = '<table>\n<thead>\n<tr>\n';
  for (const cell of headerRow) {
    html += `<th>${escapeHtml(cell)}</th>\n`;
  }
  html += '</tr>\n</thead>\n<tbody>\n';

  for (const row of dataRows) {
    html += '<tr>\n';
    for (const cell of row) {
      html += `<td>${escapeHtml(cell)}</td>\n`;
    }
    html += '</tr>\n';
  }

  html += '</tbody>\n</table>';
  return html;
}

/**
 * Parse CSV text into a 2D array of strings.
 * Handles quoted fields with commas and newlines.
 * @param {string} csv
 * @returns {string[][]}
 */
export function parseCsv(csv) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [];
        if (ch === '\r') i++; // skip \n in \r\n
      } else {
        currentField += ch;
      }
    }
  }

  // Push last field/row
  currentRow.push(currentField);
  if (currentRow.some((f) => f !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Unescape HTML entities.
 * @param {string} str
 * @returns {string}
 */
function unescapeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Supported conversion pairs: sourceFormat → [targetFormats].
 */
const CONVERSION_MAP = {
  md: ['html', 'txt'],
  html: ['md', 'txt'],
  txt: ['html'],
  csv: ['html'],
};

/**
 * Convert a document file from one format to another.
 *
 * @param {string} inputPath - Absolute path to the input file
 * @param {string} targetFormat - Target format: 'md', 'html', 'txt', 'csv'
 * @returns {Promise<{ outputPath: string, outputSize: number, mimeType: string }>}
 */
export async function convert(inputPath, targetFormat) {
  if (!inputPath) {
    throw new ValidationError('Input file path is required', 'MISSING_PARAMETER');
  }

  const target = targetFormat?.toLowerCase();
  if (!target || !SUPPORTED_TARGETS.includes(target)) {
    throw new ValidationError(
      `Unsupported target format: ${targetFormat}. Supported: ${SUPPORTED_TARGETS.join(', ')}`,
      'INVALID_PARAMETER'
    );
  }

  const sourceFormat = detectFormat(inputPath);
  if (!sourceFormat) {
    const ext = path.extname(inputPath);
    throw new ValidationError(
      `Unsupported source file format: ${ext}. Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}`,
      'INVALID_FILE_TYPE'
    );
  }

  if (sourceFormat === target) {
    throw new ValidationError(
      `Source and target formats are the same: ${target}`,
      'INVALID_PARAMETER'
    );
  }

  const allowedTargets = CONVERSION_MAP[sourceFormat];
  if (!allowedTargets || !allowedTargets.includes(target)) {
    throw new ValidationError(
      `Conversion from ${sourceFormat} to ${target} is not supported. Supported targets for ${sourceFormat}: ${(allowedTargets || []).join(', ')}`,
      'CONVERSION_UNSUPPORTED'
    );
  }

  let content;
  try {
    content = fs.readFileSync(inputPath, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new ValidationError('Input file not found', 'FILE_NOT_FOUND');
    }
    throw new ProcessingError(
      `Failed to read input file: ${err.message}`,
      'CORRUPTED_FILE'
    );
  }

  if (!content && content !== '') {
    throw new ProcessingError('Input file is empty or unreadable', 'CORRUPTED_FILE');
  }

  let output;
  try {
    output = performConversion(content, sourceFormat, target);
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ProcessingError) throw err;
    throw new ProcessingError(
      `Conversion failed: ${err.message}`,
      'PROCESSING_FAILED'
    );
  }

  const outputDir = getOutputDir();
  await ensureDir(outputDir);
  const outputFilename = `${uuidv4()}.${target === 'md' ? 'md' : target}`;
  const outputPath = path.join(outputDir, outputFilename);

  fs.writeFileSync(outputPath, output, 'utf-8');
  const stats = fs.statSync(outputPath);

  return {
    outputPath,
    outputSize: stats.size,
    mimeType: MIME_MAP[target],
  };
}

/**
 * Perform the actual content conversion.
 * @param {string} content - Source content
 * @param {string} from - Source format
 * @param {string} to - Target format
 * @returns {string} Converted content
 */
function performConversion(content, from, to) {
  if (from === 'md' && to === 'html') return markdownToHtml(content);
  if (from === 'md' && to === 'txt') return toPlainText(content, 'md');
  if (from === 'html' && to === 'md') return htmlToMarkdown(content);
  if (from === 'html' && to === 'txt') return toPlainText(content, 'html');
  if (from === 'txt' && to === 'html') return `<p>${escapeHtml(content).replace(/\n\n/g, '</p>\n<p>').replace(/\n/g, '<br>')}</p>`;
  if (from === 'csv' && to === 'html') return csvToHtml(content);

  throw new ValidationError(
    `Conversion from ${from} to ${to} is not implemented`,
    'CONVERSION_UNSUPPORTED'
  );
}
