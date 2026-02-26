import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  convert,
  markdownToHtml,
  htmlToMarkdown,
  toPlainText,
  csvToHtml,
  parseCsv,
} from './documentService.js';

let tmpDir;
let mdPath;
let htmlPath;
let txtPath;
let csvPath;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-test-'));

  // Create test Markdown file
  const mdContent = `# Hello World

This is **bold** and *italic* text.

- Item one
- Item two

[Link](https://example.com)

\`\`\`js
const x = 1;
\`\`\`
`;
  mdPath = path.join(tmpDir, 'test.md');
  fs.writeFileSync(mdPath, mdContent);

  // Create test HTML file
  const htmlContent = `<h1>Hello World</h1>
<p>This is <strong>bold</strong> and <em>italic</em> text.</p>
<ul>
<li>Item one</li>
<li>Item two</li>
</ul>
<a href="https://example.com">Link</a>`;
  htmlPath = path.join(tmpDir, 'test.html');
  fs.writeFileSync(htmlPath, htmlContent);

  // Create test plain text file
  const txtContent = 'Hello World\n\nThis is plain text.\n\nSecond paragraph.';
  txtPath = path.join(tmpDir, 'test.txt');
  fs.writeFileSync(txtPath, txtContent);

  // Create test CSV file
  const csvContent = 'Name,Age,City\nAlice,30,NYC\nBob,25,LA';
  csvPath = path.join(tmpDir, 'test.csv');
  fs.writeFileSync(csvPath, csvContent);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('markdownToHtml', () => {
  it('should convert headings', () => {
    expect(markdownToHtml('# H1')).toContain('<h1>H1</h1>');
    expect(markdownToHtml('## H2')).toContain('<h2>H2</h2>');
    expect(markdownToHtml('### H3')).toContain('<h3>H3</h3>');
  });

  it('should convert bold and italic', () => {
    const result = markdownToHtml('**bold** and *italic*');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
  });

  it('should convert links', () => {
    const result = markdownToHtml('[Click](https://example.com)');
    expect(result).toContain('<a href="https://example.com">Click</a>');
  });

  it('should convert code blocks', () => {
    const result = markdownToHtml('```js\nconst x = 1;\n```');
    expect(result).toContain('<pre><code class="language-js">');
    expect(result).toContain('const x = 1;');
  });

  it('should convert inline code', () => {
    const result = markdownToHtml('Use `console.log`');
    expect(result).toContain('<code>console.log</code>');
  });

  it('should convert unordered lists', () => {
    const result = markdownToHtml('- Item A\n- Item B');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item A</li>');
    expect(result).toContain('<li>Item B</li>');
  });

  it('should convert horizontal rules', () => {
    expect(markdownToHtml('---')).toContain('<hr>');
  });

  it('should convert images', () => {
    const result = markdownToHtml('![alt](img.png)');
    expect(result).toContain('<img src="img.png" alt="alt">');
  });

  it('should wrap plain text in paragraphs', () => {
    const result = markdownToHtml('Just some text');
    expect(result).toContain('<p>Just some text</p>');
  });
});

describe('htmlToMarkdown', () => {
  it('should convert headings', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toBe('# Title');
    expect(htmlToMarkdown('<h2>Sub</h2>')).toBe('## Sub');
  });

  it('should convert bold and italic', () => {
    const result = htmlToMarkdown('<strong>bold</strong> and <em>italic</em>');
    expect(result).toContain('**bold**');
    expect(result).toContain('*italic*');
  });

  it('should convert links', () => {
    const result = htmlToMarkdown('<a href="https://example.com">Click</a>');
    expect(result).toBe('[Click](https://example.com)');
  });

  it('should convert list items', () => {
    const result = htmlToMarkdown('<ul><li>A</li><li>B</li></ul>');
    expect(result).toContain('- A');
    expect(result).toContain('- B');
  });

  it('should strip remaining HTML tags', () => {
    const result = htmlToMarkdown('<div><span>text</span></div>');
    expect(result).toBe('text');
  });

  it('should convert horizontal rules', () => {
    expect(htmlToMarkdown('<hr>')).toBe('---');
  });
});

describe('toPlainText', () => {
  it('should strip HTML tags', () => {
    const result = toPlainText('<h1>Title</h1><p>Text</p>', 'html');
    expect(result).toContain('Title');
    expect(result).toContain('Text');
    expect(result).not.toContain('<');
  });

  it('should strip Markdown formatting', () => {
    const result = toPlainText('# Title\n\n**bold** text', 'md');
    expect(result).toContain('Title');
    expect(result).toContain('bold');
    expect(result).not.toContain('#');
    expect(result).not.toContain('**');
  });

  it('should return txt content as-is', () => {
    const result = toPlainText('plain text', 'txt');
    expect(result).toBe('plain text');
  });

  it('should return csv content as-is', () => {
    const result = toPlainText('a,b,c', 'csv');
    expect(result).toBe('a,b,c');
  });
});

describe('csvToHtml', () => {
  it('should convert CSV to an HTML table', () => {
    const result = csvToHtml('Name,Age\nAlice,30\nBob,25');
    expect(result).toContain('<table>');
    expect(result).toContain('<th>Name</th>');
    expect(result).toContain('<th>Age</th>');
    expect(result).toContain('<td>Alice</td>');
    expect(result).toContain('<td>30</td>');
  });

  it('should handle empty CSV', () => {
    const result = csvToHtml('');
    expect(result).toBe('<table></table>');
  });

  it('should escape HTML in cell values', () => {
    const result = csvToHtml('Col\n<script>alert(1)</script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>');
  });
});

describe('parseCsv', () => {
  it('should parse simple CSV', () => {
    const rows = parseCsv('a,b,c\n1,2,3');
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('should handle quoted fields with commas', () => {
    const rows = parseCsv('"hello, world",b\n1,2');
    expect(rows[0][0]).toBe('hello, world');
  });

  it('should handle escaped quotes', () => {
    const rows = parseCsv('"say ""hi""",b');
    expect(rows[0][0]).toBe('say "hi"');
  });
});

describe('convert (integration)', () => {
  it('should convert Markdown to HTML', async () => {
    const result = await convert(mdPath, 'html');
    expect(result.outputPath).toBeTruthy();
    expect(result.outputSize).toBeGreaterThan(0);
    expect(result.mimeType).toBe('text/html');

    const output = fs.readFileSync(result.outputPath, 'utf-8');
    expect(output).toContain('<h1>Hello World</h1>');
    expect(output).toContain('<strong>bold</strong>');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert Markdown to plain text', async () => {
    const result = await convert(mdPath, 'txt');
    expect(result.mimeType).toBe('text/plain');

    const output = fs.readFileSync(result.outputPath, 'utf-8');
    expect(output).toContain('Hello World');
    expect(output).not.toContain('#');
    expect(output).not.toContain('**');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert HTML to Markdown', async () => {
    const result = await convert(htmlPath, 'md');
    expect(result.mimeType).toBe('text/markdown');

    const output = fs.readFileSync(result.outputPath, 'utf-8');
    expect(output).toContain('# Hello World');
    expect(output).toContain('**bold**');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert HTML to plain text', async () => {
    const result = await convert(htmlPath, 'txt');
    expect(result.mimeType).toBe('text/plain');

    const output = fs.readFileSync(result.outputPath, 'utf-8');
    expect(output).toContain('Hello World');
    expect(output).not.toContain('<');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert plain text to HTML', async () => {
    const result = await convert(txtPath, 'html');
    expect(result.mimeType).toBe('text/html');

    const output = fs.readFileSync(result.outputPath, 'utf-8');
    expect(output).toContain('<p>');
    expect(output).toContain('Hello World');
    fs.unlinkSync(result.outputPath);
  });

  it('should convert CSV to HTML table', async () => {
    const result = await convert(csvPath, 'html');
    expect(result.mimeType).toBe('text/html');

    const output = fs.readFileSync(result.outputPath, 'utf-8');
    expect(output).toContain('<table>');
    expect(output).toContain('<th>Name</th>');
    expect(output).toContain('<td>Alice</td>');
    fs.unlinkSync(result.outputPath);
  });

  it('should throw for missing input path', async () => {
    await expect(convert(null, 'html')).rejects.toThrow('Input file path is required');
  });

  it('should throw for unsupported target format', async () => {
    await expect(convert(mdPath, 'docx')).rejects.toThrow('Unsupported target format');
  });

  it('should throw for unsupported source format', async () => {
    const unsupportedPath = path.join(tmpDir, 'test.docx');
    fs.writeFileSync(unsupportedPath, 'content');
    await expect(convert(unsupportedPath, 'html')).rejects.toThrow('Unsupported source file format');
  });

  it('should throw when source and target are the same', async () => {
    await expect(convert(mdPath, 'md')).rejects.toThrow('Source and target formats are the same');
  });

  it('should throw for unsupported conversion pair', async () => {
    await expect(convert(csvPath, 'md')).rejects.toThrow('not supported');
  });

  it('should throw for non-existent file', async () => {
    const fakePath = path.join(tmpDir, 'nonexistent.md');
    await expect(convert(fakePath, 'html')).rejects.toThrow('Input file not found');
  });
});
