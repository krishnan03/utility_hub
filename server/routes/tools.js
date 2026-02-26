import express from 'express';

/**
 * Public Tools API — lets developers and AI agents discover and query
 * the ToolsPilot tool catalog programmatically.
 *
 * GET /api/tools              — full catalog (supports ?q= and ?category=)
 * GET /api/tools/:id          — single tool by ID
 *
 * Example curl usage:
 *   curl https://toolspilot.work/api/tools
 *   curl https://toolspilot.work/api/tools?q=json
 *   curl https://toolspilot.work/api/tools?category=developer
 *   curl https://toolspilot.work/api/tools/json-yaml-xml
 */

const router = express.Router();

// ── Tool catalog (single source of truth for the API) ────────────────
// This is a curated subset with API-relevant metadata.
// Kept in sync with client/src/lib/toolRegistry.js
const TOOLS = [
  // Image
  { id: 'image-convert', name: 'Image Format Converter', description: 'Convert images between PNG, JPG, WEBP, SVG, GIF, BMP, TIFF, ICO, and AVIF', category: 'image', keywords: ['convert','png','jpg','webp','svg','gif','bmp','tiff','ico','avif'], path: '/tools/image/convert', icon: '🔀', clientSide: false, apiEndpoint: '/api/image/convert', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file + format field)' },
  { id: 'image-compress', name: 'Image Compressor', description: 'Compress images to reduce file size', category: 'image', keywords: ['compress','optimize','reduce','size'], path: '/tools/image/compress', icon: '🗜️', clientSide: false, apiEndpoint: '/api/image/compress', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file + quality field)' },
  { id: 'image-resize', name: 'Image Resizer', description: 'Resize images by pixel dimensions or percentage', category: 'image', keywords: ['resize','scale','dimensions','thumbnail'], path: '/tools/image/resize', icon: '↔️', clientSide: false, apiEndpoint: '/api/image/resize', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file + width/height fields)' },
  { id: 'image-bg-remove', name: 'Background Remover', description: 'Remove image backgrounds with AI-powered detection', category: 'image', keywords: ['background','remove','transparent','cutout'], path: '/tools/image/background-remove', icon: '✨', clientSide: false, apiEndpoint: '/api/image/remove-bg', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file)' },

  // PDF
  { id: 'pdf-convert', name: 'PDF Converter', description: 'Convert images and documents to PDF, or PDF to PNG/JPG/text', category: 'document', keywords: ['pdf','convert','png','jpg','text'], path: '/tools/pdf/convert', icon: '📄', clientSide: false, apiEndpoint: '/api/pdf/convert', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file + format field)' },
  { id: 'pdf-merge', name: 'PDF Merger', description: 'Merge multiple PDF files into one', category: 'document', keywords: ['pdf','merge','combine','join'], path: '/tools/pdf/merge', icon: '🔗', clientSide: false, apiEndpoint: '/api/pdf/merge', apiMethod: 'POST', apiAccepts: 'multipart/form-data (multiple files)' },
  { id: 'pdf-split', name: 'PDF Splitter', description: 'Split a PDF into separate files by page ranges', category: 'document', keywords: ['pdf','split','separate','extract','pages'], path: '/tools/pdf/split', icon: '✂️', clientSide: false, apiEndpoint: '/api/pdf/split', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file + ranges field)' },
  { id: 'pdf-compress', name: 'PDF Compressor', description: 'Compress PDF files to reduce size', category: 'document', keywords: ['pdf','compress','reduce','size'], path: '/tools/pdf/compress', icon: '📉', clientSide: false, apiEndpoint: '/api/pdf/compress', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file + quality field)' },

  // Document conversions
  { id: 'word-to-pdf', name: 'Word to PDF', description: 'Convert Word documents (.docx) to PDF', category: 'document', keywords: ['word','docx','pdf','convert'], path: '/tools/document/word-to-pdf', icon: '📄', clientSide: false, apiEndpoint: '/api/document/word-to-pdf', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file)' },
  { id: 'pdf-to-word', name: 'PDF to Word', description: 'Convert PDF to editable Word documents', category: 'document', keywords: ['pdf','word','docx','convert'], path: '/tools/document/pdf-to-word', icon: '📝', clientSide: false, apiEndpoint: '/api/document/pdf-to-word', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file)' },
  { id: 'pdf-to-excel', name: 'PDF to Excel', description: 'Extract tables from PDF into Excel', category: 'document', keywords: ['pdf','excel','xlsx','table','extract'], path: '/tools/document/pdf-to-excel', icon: '📊', clientSide: false, apiEndpoint: '/api/document/pdf-to-excel', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file)' },
  { id: 'ppt-to-pdf', name: 'PowerPoint to PDF', description: 'Convert PowerPoint presentations to PDF', category: 'document', keywords: ['powerpoint','ppt','pptx','pdf'], path: '/tools/document/ppt-to-pdf', icon: '📽️', clientSide: false, apiEndpoint: '/api/document/ppt-to-pdf', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file)' },

  // Media
  { id: 'audio-convert', name: 'Audio Converter', description: 'Convert audio between MP3, WAV, OGG, FLAC, AAC, M4A', category: 'media', keywords: ['audio','convert','mp3','wav','ogg','flac'], path: '/tools/media/audio-convert', icon: '🎵', clientSide: false, apiEndpoint: '/api/media/audio/convert', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file + format field)' },
  { id: 'video-convert', name: 'Video Converter', description: 'Convert video between MP4, WEBM, AVI, MOV, MKV', category: 'media', keywords: ['video','convert','mp4','webm','avi'], path: '/tools/media/video-convert', icon: '🎥', clientSide: false, apiEndpoint: '/api/media/video/convert', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file + format field)' },

  // OCR
  { id: 'ocr', name: 'OCR — Image to Text', description: 'Extract text from images in 10+ languages', category: 'text', keywords: ['ocr','extract','text','image','scan'], path: '/tools/text/ocr', icon: '🔍', clientSide: false, apiEndpoint: '/api/ocr', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file + language field)' },

  // QR
  { id: 'qr-barcode', name: 'QR Code Generator', description: 'Generate QR codes and barcodes', category: 'utility', keywords: ['qr','barcode','generate','scan'], path: '/tools/utility/qr-barcode', icon: '📲', clientSide: false, apiEndpoint: '/api/qr/generate', apiMethod: 'POST', apiAccepts: 'application/json { text, format, size }' },

  // SEO
  { id: 'seo-analyzer', name: 'SEO Analyzer', description: 'Analyze web pages for SEO quality', category: 'seo', keywords: ['seo','meta','tags','analyze'], path: '/tools/seo/seo-analyzer', icon: '📈', clientSide: false, apiEndpoint: '/api/seo/analyze', apiMethod: 'POST', apiAccepts: 'application/json { url }' },

  // Favicon
  { id: 'favicon-generator', name: 'Favicon Generator', description: 'Generate a complete favicon set from a single image', category: 'design', keywords: ['favicon','icon','web','ico','png'], path: '/tools/design/favicon-generator', icon: '⭐', clientSide: false, apiEndpoint: '/api/favicon/generate', apiMethod: 'POST', apiAccepts: 'multipart/form-data (file)' },

  // Client-side tools (no API endpoint — runs in browser)
  { id: 'json-yaml-xml', name: 'JSON / YAML / XML Formatter', description: 'Format, validate, and convert between JSON, YAML, and XML', category: 'developer', keywords: ['json','yaml','xml','format','validate'], path: '/tools/developer/json-yaml-xml', icon: '🧩', clientSide: true },
  { id: 'jwt-decoder', name: 'JWT Decoder', description: 'Decode JWT tokens and inspect header, payload, signature', category: 'developer', keywords: ['jwt','token','decode','auth'], path: '/tools/developer/jwt-decoder', icon: '🗝️', clientSide: true },
  { id: 'regex-tester', name: 'Regex Tester', description: 'Test regular expressions with real-time matching', category: 'developer', keywords: ['regex','pattern','match','test'], path: '/tools/developer/regex-tester', icon: '🎯', clientSide: true },
  { id: 'password-generator', name: 'Password Generator', description: 'Generate secure random passwords and passphrases', category: 'security', keywords: ['password','generate','secure','random'], path: '/tools/security/password-generator', icon: '🔐', clientSide: true },
  { id: 'text-utilities', name: 'Text Utilities', description: 'Case conversion, word count, encoding, hashing, diff', category: 'text', keywords: ['text','case','uppercase','lowercase','word count','hash'], path: '/tools/text/utilities', icon: '🔡', clientSide: true },
  { id: 'excel-editor', name: 'Online Excel Editor', description: 'Edit Excel spreadsheets with formulas, formatting, charts', category: 'spreadsheet', keywords: ['excel','editor','spreadsheet','xlsx'], path: '/tools/spreadsheet/excel-editor', icon: '📊', clientSide: true },
  { id: 'word-editor', name: 'Online Word Editor', description: 'Create and edit documents with rich formatting and DOCX export', category: 'document', keywords: ['word','editor','document','docx'], path: '/tools/document/word-editor', icon: '📝', clientSide: true },
  { id: 'compound-interest', name: 'Compound Interest Calculator', description: 'Calculate compound interest with monthly contributions', category: 'finance', keywords: ['compound','interest','investment','growth'], path: '/tools/finance/compound-interest', icon: '💰', clientSide: true },
  { id: 'currency-converter', name: 'Currency Converter', description: 'Convert between 150+ world currencies', category: 'finance', keywords: ['currency','converter','exchange','rate'], path: '/tools/finance/currency-converter', icon: '💱', clientSide: true },
];

const BASE_URL = 'https://toolspilot.work';

// GET /api/tools — list all tools, with optional ?q= and ?category= filters
router.get('/', (req, res) => {
  const { q, category } = req.query;
  let results = TOOLS;

  if (category) {
    const cat = category.toLowerCase();
    results = results.filter((t) => t.category === cat);
  }

  if (q) {
    const query = q.toLowerCase().trim();
    const words = query.split(/\s+/);
    results = results.filter((t) => {
      const haystack = `${t.name} ${t.description} ${t.keywords.join(' ')}`.toLowerCase();
      return words.some((w) => haystack.includes(w));
    });
  }

  res.json({
    success: true,
    count: results.length,
    tools: results.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      url: `${BASE_URL}${t.path}`,
      clientSide: t.clientSide,
      ...(t.apiEndpoint && {
        api: {
          endpoint: `${BASE_URL}${t.apiEndpoint}`,
          method: t.apiMethod,
          accepts: t.apiAccepts,
        },
      }),
    })),
  });
});

// GET /api/tools/:id — single tool details
router.get('/:id', (req, res) => {
  const tool = TOOLS.find((t) => t.id === req.params.id);
  if (!tool) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Tool "${req.params.id}" not found` },
    });
  }

  res.json({
    success: true,
    tool: {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      keywords: tool.keywords,
      icon: tool.icon,
      url: `${BASE_URL}${tool.path}`,
      clientSide: tool.clientSide,
      ...(tool.apiEndpoint && {
        api: {
          endpoint: `${BASE_URL}${tool.apiEndpoint}`,
          method: tool.apiMethod,
          accepts: tool.apiAccepts,
          curlExample: tool.apiMethod === 'POST' && tool.apiAccepts.includes('multipart')
            ? `curl -X POST ${BASE_URL}${tool.apiEndpoint} -F "file=@yourfile.pdf"`
            : tool.apiMethod === 'POST'
              ? `curl -X POST ${BASE_URL}${tool.apiEndpoint} -H "Content-Type: application/json" -d '${JSON.stringify({ example: 'data' })}'`
              : `curl ${BASE_URL}${tool.apiEndpoint}`,
        },
      }),
    },
  });
});

export default router;
