# Implementation Plan: All-in-One Utility Hub

## Overview

Incremental implementation of a full-stack utility hub with React + Tailwind frontend, Express backend, Docker deployment, and comprehensive testing. Tasks are grouped by domain and build on each other — scaffolding first, then core infrastructure, UI shell, and individual tool categories. Property-based tests and E2E tests are woven in close to their related implementations.

## Tasks

- [x] 1. Project scaffolding and monorepo setup
  - [x] 1.1 Initialize monorepo with client (React + Vite) and server (Express) packages
    - Create root `package.json` with workspaces for `client/` and `server/`
    - Initialize `client/` with Vite + React, install `react-router-dom`, `zustand`, `tailwindcss`, `framer-motion`, `axios`
    - Initialize `server/` with Express, install `sharp`, `pdf-lib`, `fluent-ffmpeg`, `tesseract.js`, `multer`, `uuid`, `node-cron`, `cors`, `helmet`
    - Configure Tailwind CSS with a CRED-inspired dark/light theme palette
    - _Requirements: 18.1, 18.4_

  - [x] 1.2 Configure testing frameworks
    - Install and configure Vitest + React Testing Library for client
    - Install and configure Vitest for server unit tests
    - Install `fast-check` for property-based testing
    - Install and configure Playwright for E2E tests
    - Create shared Vitest config with coverage thresholds (≥80%)
    - _Requirements: 19.1, 19.3_

  - [x] 1.3 Create Docker Compose deployment setup
    - Create `Dockerfile` for client (Nginx serving built React app)
    - Create `Dockerfile` for server (Node.js)
    - Create `docker-compose.yml` orchestrating client, server, and reverse proxy (Nginx/Caddy)
    - Create `.env.example` with all configurable environment variables (storage paths, cleanup interval, API keys, max file size)
    - _Requirements: 18.3, 18.4_

  - [x] 1.4 Create README and contributing guide
    - Write README with setup instructions, environment requirements, and deployment steps
    - Write CONTRIBUTING.md with code style, branching strategy, and PR guidelines
    - Add OSI-approved license file (MIT)
    - _Requirements: 18.1, 18.2, 18.5_

- [x] 2. Core backend infrastructure
  - [x] 2.1 Implement Express server entry point and config
    - Create `server/index.js` with Express app, CORS, helmet, JSON parsing
    - Create `server/config/index.js` reading all env vars with defaults
    - Set up route mounting structure for all API route groups
    - _Requirements: 18.4, 19.2_

  - [x] 2.2 Implement file upload middleware and validation
    - Create `server/middleware/upload.js` with Multer config (disk storage, file naming with UUID, temp directory)
    - Create `server/middleware/validate.js` for request parameter validation
    - Create `server/middleware/sanitize.js` for file sanitization (strip embedded scripts, validate MIME vs extension)
    - Enforce default 100MB max file size, allow per-tool overrides
    - _Requirements: 16.6, 16.7, 16.8_

  - [x] 2.3 Implement rate limiting and security middleware
    - Create `server/middleware/rateLimit.js` using `express-rate-limit`
    - Implement session ID generation and isolation (UUID per session, stored in cookie)
    - Ensure TLS configuration notes in deployment (Nginx/Caddy handles TLS)
    - _Requirements: 16.1, 16.3, 16.4_

  - [x] 2.4 Implement global error handler and custom error classes
    - Create `server/utils/errors.js` with `ValidationError`, `ProcessingError`, `NotFoundError`, `ForbiddenError`
    - Create `server/middleware/errorHandler.js` returning consistent JSON error responses with error codes
    - Implement request ID logging for all errors
    - _Requirements: 19.3, 1.3, 5.3_

  - [x] 2.5 Implement file download routes and session isolation
    - Create `server/routes/files.js` with `GET /api/files/:id/download` and `DELETE /api/files/:id`
    - Implement session-based access control (403 if session mismatch)
    - Stream files for download, display expiry countdown in response metadata
    - _Requirements: 15.4, 15.5, 16.3_

  - [x] 2.6 Implement data cleanup service (CRON)
    - Create `server/services/cleanupService.js` with node-cron running every hour
    - Delete files older than 24 hours from disk and remove metadata records
    - Handle locked files gracefully (skip and retry next cycle)
    - Create `server/utils/fileHelpers.js` for file path management and temp file utilities
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ]* 2.7 Write property tests for core infrastructure
    - **Property 19: File cleanup after expiry** — verify files older than 24h are removed from storage and metadata
    - **Validates: Requirements 15.1**
    - **Property 20: File deletion completeness** — verify both physical file and metadata are removed on delete
    - **Validates: Requirements 15.3, 15.5**
    - **Property 21: Expiry countdown calculation** — verify remaining time equals 24h minus elapsed (±1s tolerance)
    - **Validates: Requirements 15.4**
    - **Property 22: Session isolation** — verify session A files are inaccessible from session B (403/404)
    - **Validates: Requirements 16.3**
    - **Property 23: File size limit enforcement** — verify files exceeding max size are rejected with error message
    - **Validates: Requirements 16.7, 16.8**
    - **Property 28: Failed operations return descriptive errors** — verify error responses contain non-empty message and non-2xx status
    - **Validates: Requirements 19.3**

- [x] 3. Checkpoint — Core infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Frontend UI shell and navigation
  - [x] 4.1 Create layout components (AppShell, Navbar, Sidebar, Footer)
    - Create `src/components/layout/AppShell.jsx` as main layout wrapper with dark/light theme support
    - Create `src/components/layout/Navbar.jsx` with logo, global search bar, and theme toggle
    - Create `src/components/layout/Sidebar.jsx` for desktop category navigation
    - Create `src/components/layout/Footer.jsx`
    - _Requirements: 17.2, 17.5, 22.1_

  - [x] 4.2 Create MobileMenu and responsive layout
    - Create `src/components/layout/MobileMenu.jsx` as collapsible hamburger menu
    - Implement responsive breakpoints: desktop (≥1024px), tablet (768–1023px), mobile (<768px)
    - Single-column layout on mobile, two-column on tablet landscape, full layout on desktop
    - Ensure 44x44px minimum touch targets on mobile/tablet
    - _Requirements: 17.8, 17.9, 17.10, 31.1, 31.3, 31.6_

  - [x] 4.3 Create tool registry and search infrastructure
    - Create `src/lib/toolRegistry.js` with all tool definitions (id, name, description, category, keywords, path, icon, isClientSide, supportedFormats)
    - Create `src/stores/useToolStore.js` with search query, active category, filtered tools getter
    - Create `src/components/common/SearchBar.jsx` with real-time filtering by name/description/keywords
    - _Requirements: 17.1, 17.2, 17.7_

  - [x] 4.4 Create routing, pages, and recently-used tracking
    - Create `src/App.jsx` with React Router routes for HomePage, CategoryPage, ToolPage, NotFoundPage
    - Create `src/components/pages/HomePage.jsx` with category overview and featured tools
    - Create `src/components/pages/CategoryPage.jsx` listing tools in a category
    - Create `src/components/pages/ToolPage.jsx` as generic tool page wrapper with related tools sidebar
    - Create `src/stores/useHistoryStore.js` tracking recent tools in localStorage (max 10)
    - _Requirements: 17.3, 17.4, 17.5_

  - [x] 4.5 Create ThemeToggle and theme store
    - Create `src/stores/useThemeStore.js` with dark/light/system mode persisted to localStorage
    - Create `src/components/common/ThemeToggle.jsx` toggle button
    - Apply Tailwind dark mode classes throughout layout
    - _Requirements: 22.1, 22.5_

  - [x] 4.6 Create shared UI components
    - Create `src/components/common/FileUpload.jsx` — drag-and-drop upload zone with file type/size validation
    - Create `src/components/common/BatchUpload.jsx` — multi-file upload with individual progress bars
    - Create `src/components/common/ProgressBar.jsx` — processing progress indicator
    - Create `src/components/common/ErrorMessage.jsx` — error display with retry button
    - Create `src/components/common/DownloadButton.jsx` — file download with expiry countdown
    - Create `src/components/common/PreviewPanel.jsx` — side-by-side before/after preview
    - _Requirements: 19.1, 19.3, 22.2, 22.3, 22.4_

  - [x] 4.7 Create file and processing stores and hooks
    - Create `src/stores/useFileStore.js` with files array, processing state, progress, error
    - Create `src/hooks/useFileUpload.js` for client-side file validation and upload logic
    - Create `src/hooks/useServerProcess.js` for API call wrapper with progress tracking
    - Create `src/hooks/useClientProcess.js` for client-side processing wrapper
    - Create `src/lib/api.js` as Axios client with base URL config and error interceptors
    - _Requirements: 19.1, 19.4_

  - [ ]* 4.8 Write property tests for tool discovery
    - **Property 24: Tool search returns matching results** — verify every returned tool matches query against name/description/keywords
    - **Validates: Requirements 17.1**
    - **Property 25: All tools belong to valid categories** — verify every tool has a category from the defined set
    - **Validates: Requirements 17.2**
    - **Property 26: Recent tools tracking** — verify interacted tools appear in recent list, max 10 entries, MRU order
    - **Validates: Requirements 17.3**
    - **Property 27: Related tools share category** — verify all suggested related tools share the current tool's category
    - **Validates: Requirements 17.4**

- [x] 5. Checkpoint — UI shell and navigation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Image tools
  - [x] 6.1 Implement image conversion service and route
    - Create `server/services/imageService.js` with `convert(inputPath, targetFormat, options)` using sharp
    - Support formats: PNG, JPG, WEBP, SVG, GIF, BMP, TIFF, ICO, AVIF
    - Implement EXIF metadata preservation option (preserve or strip)
    - Create `server/routes/image.js` with `POST /api/image/convert` handling single and batch (up to 20) uploads
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 6.2 Write property tests for image conversion
    - **Property 1: Image format conversion produces valid output** — verify conversion produces non-empty valid file in target format
    - **Validates: Requirements 1.1, 1.2**
    - **Property 2: Image metadata preservation** — verify EXIF fields preserved when option enabled
    - **Validates: Requirements 1.4**
    - **Property 3: Invalid file rejection** — verify non-image files return error with descriptive message
    - **Validates: Requirements 1.3**
    - **Property 4: Batch processing size limits** — verify batches of 1–20 succeed, >20 rejected
    - **Validates: Requirements 1.5, 2.4, 3.4**

  - [x] 6.3 Implement image compression service and route
    - Add `compress(inputPath, quality, mode)` to imageService.js supporting lossy and lossless modes
    - Return original and compressed file sizes in response
    - Create `POST /api/image/compress` route with batch support (up to 20)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 6.4 Write property tests for image compression
    - **Property 5: Compression reduces or maintains file size** — verify output size ≤ original size for any quality level
    - **Validates: Requirements 2.1, 2.3**
    - **Property 6: Lossless compression preserves pixel data** — verify lossless output is pixel-identical to original
    - **Validates: Requirements 2.2**

  - [x] 6.5 Implement image resize service and route
    - Add `resize(inputPath, options)` to imageService.js supporting pixel dimensions, percentage, and aspect ratio lock
    - Include preset templates for Instagram, Twitter, Facebook, LinkedIn, YouTube thumbnail
    - Create `POST /api/image/resize` route with batch support (up to 20)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.6 Write property tests for image resize
    - **Property 7: Image resize matches specification** — verify output dimensions match target (pixel or percentage)
    - **Validates: Requirements 3.1, 3.5**
    - **Property 8: Aspect ratio preservation during resize** — verify height preserves ratio when only width specified (±1px)
    - **Validates: Requirements 3.2**

  - [x] 6.7 Implement image editing service and route (crop, rotate, flip, watermark)
    - Add `edit(inputPath, operations)` to imageService.js supporting crop (with presets 1:1, 4:3, 16:9, free), rotate (90/180/270/custom), flip (horizontal/vertical), and text/image watermark with opacity/position/tiling
    - Create `POST /api/image/edit` route with batch watermark support (up to 20)
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_

  - [x] 6.8 Implement background removal service and route
    - Create `server/services/backgroundRemoval.js` using `@imgly/background-removal-node`
    - Support transparent output, manual refinement brush data, background replacement (solid color or custom image)
    - Create `POST /api/image/remove-bg` route with batch support (up to 10)
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

  - [x] 6.9 Create frontend image tool components
    - Create `src/components/tools/image/ImageConverter.jsx` with format selector, batch upload, preview, download
    - Create `src/components/tools/image/ImageCompressor.jsx` with quality slider, lossless toggle, side-by-side preview, size comparison
    - Create `src/components/tools/image/ImageResizer.jsx` with dimension inputs, aspect ratio lock, preset buttons, percentage mode
    - Create `src/components/tools/image/ImageEditor.jsx` with crop tool, rotation controls, flip buttons, watermark config, real-time preview
    - Create `src/components/tools/image/BackgroundRemover.jsx` with refinement brush, side-by-side preview, background replacement options
    - _Requirements: 2.5, 23.5, 24.3_

- [x] 7. Checkpoint — Image tools
  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. PDF tools
  - [x] 8.1 Implement PDF conversion service and route
    - Create `server/services/pdfService.js` with `convertToPdf(inputPaths)` and `convertFromPdf(inputPath, targetFormat)` using pdf-lib and sharp
    - Support conversion from images/documents to PDF, and PDF to PNG/JPG/text
    - Create `server/routes/pdf.js` with `POST /api/pdf/convert`
    - _Requirements: 4.1, 4.5_

  - [x] 8.2 Implement PDF merge and split
    - Add `merge(pdfPaths, order)` and `split(pdfPath, pageRanges)` to pdfService.js
    - Create `POST /api/pdf/merge` and `POST /api/pdf/split` routes
    - _Requirements: 4.2, 4.3_

  - [ ]* 8.3 Write property tests for PDF merge and split
    - **Property 9: PDF merge preserves total page count** — verify merged PDF page count equals sum of inputs
    - **Validates: Requirements 4.2**
    - **Property 10: PDF split preserves specified pages** — verify split files' combined page count equals specified ranges
    - **Validates: Requirements 4.3**

  - [x] 8.4 Implement PDF compression
    - Add `compress(pdfPath)` to pdfService.js, return original and compressed sizes
    - Create `POST /api/pdf/compress` route
    - _Requirements: 4.4_

  - [ ]* 8.5 Write property test for PDF compression
    - **Property 11: PDF compression produces valid smaller output** — verify output size ≤ original and output is valid PDF
    - **Validates: Requirements 4.4**

  - [x] 8.6 Implement PDF password protection and unlock
    - Add `protect(pdfPath, password)` and `unlock(pdfPath, password)` to pdfService.js
    - Create `POST /api/pdf/protect` route handling both add and remove password
    - _Requirements: 4.6, 4.7_

  - [ ]* 8.7 Write property test for PDF password round-trip
    - **Property 12: PDF password protection round-trip** — verify protect then unlock with same password produces equivalent PDF
    - **Validates: Requirements 4.6, 4.7**

  - [x] 8.8 Implement PDF page reorder, rotate, watermark, and page management
    - Add `reorder(pdfPath, pageOrder)`, `rotate(pdfPath, pages, angle)`, `watermark(pdfPath, config)`, `addPage(pdfPath)`, `deletePage(pdfPath, pageNum)`, `extractPage(pdfPath, pageNum)` to pdfService.js
    - Create routes: `POST /api/pdf/reorder`, `POST /api/pdf/rotate`, `POST /api/pdf/watermark`, `POST /api/pdf/pages`
    - _Requirements: 4.8, 4.9, 4.10, 4.11_

  - [ ]* 8.9 Write property tests for PDF page operations
    - **Property 13: PDF page reorder preserves page count** — verify reordered PDF has same N pages
    - **Validates: Requirements 4.8**
    - **Property 14: PDF rotation by 360° is identity** — verify 4×90° rotation produces same dimensions
    - **Validates: Requirements 4.9**
    - **Property 15: PDF watermark preserves page count** — verify watermarked PDF has same N pages
    - **Validates: Requirements 4.10**
    - **Property 16: PDF page add/delete count invariant** — verify add→N+1, delete→N-1, extract→1 page
    - **Validates: Requirements 4.11**

  - [x] 8.10 Implement e-signature on PDF
    - Create `server/services/signatureService.js` for embedding signature (draw/type/upload) onto PDF pages with positioning, resizing, date stamps, and text annotations
    - Create `server/routes/signature.js` with `POST /api/signature/sign`
    - _Requirements: 26.1, 26.2, 26.3, 26.4_

  - [ ] 8.11 Create frontend PDF tool components
    - Create `src/components/tools/pdf/PdfConverter.jsx` — upload images/docs, convert to/from PDF
    - Create `src/components/tools/pdf/PdfMerger.jsx` — multi-file upload, drag-and-drop reorder, merge
    - Create `src/components/tools/pdf/PdfSplitter.jsx` — page range input, split and download
    - Create `src/components/tools/pdf/PdfCompressor.jsx` — upload, compress, size comparison
    - Create `src/components/tools/pdf/PdfProtect.jsx` — add/remove password
    - Create `src/components/tools/pdf/PdfReorder.jsx` — drag-and-drop page reorder with thumbnails
    - Create `src/components/tools/pdf/PdfRotate.jsx` — select pages, choose rotation angle
    - Create `src/components/tools/pdf/PdfWatermark.jsx` — text/image watermark config, opacity, position
    - Create `src/components/tools/pdf/PdfPages.jsx` — add, delete, extract individual pages
    - Create `src/components/tools/pdf/ESignature.jsx` — draw/type/upload signature, place on PDF, save to localStorage
    - _Requirements: 26.5_

- [x] 9. Checkpoint — PDF tools
  - Ensure all tests pass, ask the user if questions arise.

- [-] 10. Document conversion tools
  - [x] 10.1 Implement document conversion service and route
    - Create `server/services/documentService.js` with `convert(inputPath, targetFormat)` supporting Markdown, HTML, plain text, CSV, XLSX
    - Preserve formatting and structure where target format supports it
    - Return descriptive errors for invalid/corrupted documents
    - Create `server/routes/document.js` with `POST /api/document/convert`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 10.2 Write property tests for document conversion
    - **Property 17: Document format conversion** — verify conversion produces non-empty file in target format
    - **Validates: Requirements 5.1, 5.2**
    - **Property 18: Document structure round-trip preservation** — verify Markdown→HTML→Markdown preserves structural elements
    - **Validates: Requirements 5.4**

  - [ ] 10.3 Create frontend document conversion component
    - Create `src/components/tools/document/DocumentConverter.jsx` with format selector, upload, preview, download
    - _Requirements: 5.1_

- [-] 11. Text tools
  - [x] 11.1 Implement client-side text utilities
    - Create `src/utils/textUtils.js` with:
      - Case conversion (uppercase, lowercase, title, sentence, camelCase, snake_case, kebab-case)
      - Word/character/sentence count and reading time estimation
      - Base64, URL encoding, HTML entity encoding/decoding
      - Hash generation (MD5, SHA-1, SHA-256, SHA-512) using Web Crypto API
      - Text diff (additions, deletions, modifications)
      - Lorem Ipsum generation with configurable paragraph count
      - Find-and-replace with regex support
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ] 11.2 Create frontend text utility components
    - Create `src/components/tools/text/TextUtilities.jsx` — tabbed interface for case conversion, encoding, hashing, diff, lorem ipsum, find-replace, word count
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ] 11.3 Implement Markdown editor with live preview
    - Create `src/components/tools/text/MarkdownEditor.jsx` with:
      - Split-pane editor with real-time rendered preview
      - Toolbar with formatting buttons (headings, bold, italic, links, images, code blocks, lists)
      - Export to HTML and PDF
      - HTML paste → Markdown conversion
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [x] 11.4 Implement text summarizer
    - Create `src/utils/textSummarizer.js` with extractive summarization (sentence scoring by position, frequency, length)
    - Support summary lengths: short (25%), medium (50%), long (75%)
    - Enforce 50,000 character max, 100 character minimum with warning
    - Create `src/components/tools/text/TextSummarizer.jsx` with input area, length selector, summary output, copy/download, length comparison
    - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6, 36.7_

- [-] 12. Developer tools
  - [x] 12.1 Implement data transformation utilities
    - Create `src/utils/dataTransform.js` with:
      - JSON ↔ CSV conversion with correct field mapping
      - JSON ↔ YAML conversion preserving data types
      - JSON ↔ XML conversion preserving structure
      - JSON/YAML/XML formatting, validation, and syntax error reporting
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 21.1, 21.2, 21.3_

  - [ ]* 12.2 Write property tests for data transformation round-trips
    - **Property (21.4): JSON→CSV→JSON round-trip** — verify data-equivalent object after round-trip
    - **Validates: Requirements 21.4**
    - **Property (21.5): JSON→YAML→JSON round-trip** — verify equivalent object after round-trip
    - **Validates: Requirements 21.5**
    - **Property (21.6): JSON→XML→JSON round-trip** — verify equivalent object after round-trip
    - **Validates: Requirements 21.6**

  - [ ] 12.3 Implement remaining developer tool utilities
    - JWT decoder: parse header, payload, signature, show expiration status
    - Regex tester: real-time matching, group highlighting, common pattern templates
    - Cron expression parser: display next 5 execution times in human-readable format
    - Unix timestamp converter: bidirectional conversion between timestamp and date-time
    - CSS minifier/beautifier
    - HTML minifier/beautifier
    - _Requirements: 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [ ] 12.4 Create frontend developer tool components
    - Create `src/components/tools/developer/JsonYamlXml.jsx` — format, validate, convert between JSON/YAML/XML with syntax highlighting
    - Create `src/components/tools/developer/JwtDecoder.jsx` — paste JWT, view decoded sections
    - Create `src/components/tools/developer/RegexTester.jsx` — pattern input, test string, live matches
    - Create `src/components/tools/developer/CronParser.jsx` — cron input, next 5 times display
    - Create `src/components/tools/developer/TimestampConverter.jsx` — bidirectional timestamp/date conversion
    - Create `src/components/tools/developer/CssMinify.jsx` — minify/beautify CSS
    - Create `src/components/tools/developer/HtmlMinify.jsx` — minify/beautify HTML
    - Create `src/components/tools/developer/DataTransformer.jsx` — JSON↔CSV, JSON↔YAML, JSON↔XML conversion UI
    - _Requirements: 8.1–8.10, 21.1–21.3_

- [ ] 13. Checkpoint — Document, text, and developer tools
  - Ensure all tests pass, ask the user if questions arise.

- [-] 14. Media tools
  - [x] 14.1 Implement audio/video conversion service and routes
    - Create `server/services/mediaService.js` using fluent-ffmpeg
    - Audio conversion between MP3, WAV, OGG, FLAC, AAC, M4A with bitrate control
    - Video conversion between MP4, WEBM, AVI, MOV, MKV with resolution control
    - Enforce 100MB max file size per upload
    - Create `server/routes/media.js` with `POST /api/media/convert-audio` and `POST /api/media/convert-video`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 14.2 Implement GIF maker service and route
    - Create `server/services/gifService.js` for creating GIFs from images (configurable frame delay 50–5000ms, up to 50 images) and video clips (start/end time selection, up to 30s)
    - Support output dimension and frame rate config, enforce 20MB max output
    - Create `server/routes/gif.js` with `POST /api/gif/create`
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6_

  - [ ] 14.3 Create frontend media tool components
    - Create `src/components/tools/media/AudioConverter.jsx` — format selector, bitrate control, upload, download
    - Create `src/components/tools/media/VideoConverter.jsx` — format selector, resolution control, upload, download
    - Create `src/components/tools/media/GifMaker.jsx` — image upload or video upload, frame delay/rate config, preview, download
    - _Requirements: 10.1–10.6, 29.1–29.6_

- [ ] 15. AI tools
  - [ ] 15.1 Implement AI content detection
    - Create `src/components/tools/ai/AiDetector.jsx` with:
      - Text input (up to 10,000 characters) with confidence score display (percentage + classification: Likely Human / Mixed / Likely AI)
      - Image upload with AI-generation confidence score
      - Warning for text shorter than 50 characters
    - Implement client-side heuristic analysis (sentence length variance, perplexity estimation, vocabulary diversity) as a baseline detector
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [-] 16. Student tools
  - [x] 16.1 Implement citation generator
    - Create `src/utils/citationFormatter.js` with formatting logic for APA 7th, MLA 9th, Chicago 17th, Harvard styles
    - Support source types: book, journal article, website, conference paper, thesis, video
    - Implement bibliography list management with style switching (reformat all on switch)
    - Create `src/components/tools/student/CitationGenerator.jsx` with source form, style selector, bibliography list, export (plain text/Markdown/HTML), copy-to-clipboard
    - _Requirements: 32.1, 32.2, 32.3, 32.5, 32.6, 32.7, 32.8_

  - [x] 16.2 Implement academic text metrics
    - Create `src/utils/academicMetrics.js` with:
      - Word/character/sentence/paragraph count
      - Page estimation (250 words/page double-spaced, 500 single-spaced)
      - Speaking time (130 wpm)
      - Readability scores: Flesch-Kincaid, Flesch Reading Ease, Gunning Fog, Coleman-Liau
      - Education level classification (Elementary through Graduate)
    - Create `src/components/tools/student/AcademicMetrics.jsx` — text input, metrics dashboard
    - All calculations client-side
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6_

  - [x] 16.3 Implement GPA calculator
    - Create `src/utils/gpaCalculator.js` with:
      - Standard 4.0 scale (A=4.0 through F=0.0)
      - Custom grading scale support
      - Semester and cumulative GPA calculation
      - Immediate recalculation on grade/credit changes
    - Create `src/components/tools/student/GpaCalculator.jsx` — course entry form, semester tabs, GPA display, export to PDF/CSV, localStorage persistence
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 34.6, 34.7_

  - [ ] 16.4 Implement LaTeX math renderer
    - Create `src/components/tools/student/LatexRenderer.jsx` using KaTeX or MathJax for client-side rendering
    - Real-time preview, download as PNG/SVG with configurable resolution and background
    - Syntax error display with location info
    - Quick-reference panel of common LaTeX symbols
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6_

  - [x] 16.5 Implement Pomodoro and study timer
    - Create `src/utils/pomodoroTimer.js` with timer logic (work/short break/long break cycling, long break after 4 sessions)
    - Create `src/components/tools/student/StudyTimer.jsx` with:
      - Configurable durations, pause/resume/reset, audio notification, visual alert
      - Session counter, custom timer mode
      - Background tab support using `Date.now()` drift correction
      - Session history in localStorage with daily summary
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6, 37.7, 37.8_

  - [ ] 16.6 Implement flashcard generator
    - Create `src/utils/flashcardParser.js` for CSV import/export and delimiter-based auto-generation
    - Create `src/components/tools/student/FlashcardEngine.jsx` with:
      - Manual card creation (front/back), CSV import, delimiter-based auto-generation
      - Study mode with flip animation, shuffle
      - Export to CSV and printable PDF
      - localStorage persistence for flashcard sets
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6, 38.7_

  - [x] 16.7 Implement scientific calculator
    - Create `src/utils/scientificCalc.js` with:
      - Basic arithmetic with correct order of operations
      - Trig functions (sin, cos, tan, inverses) in degree and radian modes
      - log, ln, exponentiation, sqrt, nth root
      - Factorial, permutation, combination
      - Constants: π, e (15+ decimal digits)
      - Parenthetical and nested expressions
      - Error handling (division by zero, invalid domain)
    - Create `src/components/tools/student/ScientificCalculator.jsx` with on-screen buttons, keyboard input, calculation history
    - _Requirements: 39.1, 39.2, 39.3, 39.4, 39.5, 39.6, 39.7, 39.8, 39.9, 39.10_

  - [x] 16.8 Implement essay outline generator
    - Create `src/utils/essayOutline.js` with outline generation for essay types (argumentative, expository, narrative, compare-and-contrast, persuasive)
    - Generate intro, body (3–7 paragraphs), conclusion with placeholder thesis, topic sentences, supporting points
    - Create `src/components/tools/student/EssayOutline.jsx` with topic input, type selector, paragraph count, editable/reorderable outline, export (plain text/Markdown/DOCX)
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6_

- [ ] 17. Checkpoint — Student tools
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Design tools
  - [x] 18.1 Implement color utilities
    - Create `src/utils/colorUtils.js` with:
      - Color conversion between HEX, RGB, HSL, HSV, CMYK
      - Palette generation: complementary, analogous, triadic, monochromatic
      - WCAG contrast ratio calculation with AA/AAA pass/fail
      - Color extraction from image (using canvas pixel sampling)
    - Create `src/components/tools/design/ColorTools.jsx` with color picker, format display, palette generator, contrast checker, image palette extractor
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ] 18.2 Implement meme generator
    - Create `server/services/memeService.js` with template library (50+ templates organized by category), text overlay rendering with configurable font/size/color/stroke
    - Create `server/routes/meme.js` with `POST /api/meme/generate` and `GET /api/meme/templates`
    - Create `src/components/tools/design/MemeGenerator.jsx` with template browser, custom image upload, text editing, social media presets (Instagram, Facebook, Twitter, LinkedIn), real-time preview, export PNG/JPG
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.6_

  - [x] 18.3 Implement favicon generator
    - Create `server/services/faviconService.js` generating favicon set (16x16, 32x32, 48x48, 64x64, 128x128, 180x180, 192x192, 512x512) in ICO/PNG/SVG formats
    - Generate ZIP archive with all favicons and HTML embedding snippet
    - Create `server/routes/favicon.js` with `POST /api/favicon/generate`
    - Create `src/components/tools/design/FaviconGenerator.jsx` with upload, square crop tool, size previews, download ZIP
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

- [ ] 19. Utility tools
  - [x] 19.1 Implement unit and currency converter
    - Create `src/utils/unitConverter.js` with conversions for length, weight, volume, temperature, speed, area, data storage, and time zones
    - Implement currency conversion with daily-updated exchange rates (fetch from public API, cache client-side)
    - Create `src/components/tools/utility/UnitConverter.jsx` with category tabs, source/target unit selectors, instant conversion display, time zone display
    - All conversions client-side
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 19.2 Implement QR code and barcode tools
    - Create `server/services/qrService.js` for QR generation (customizable color, background, size, error correction), QR decoding, barcode generation (Code 128, EAN-13, UPC-A), barcode decoding
    - Create `server/routes/qr.js` with `POST /api/qr/generate`, `POST /api/qr/decode`, `POST /api/qr/barcode`
    - Create `src/components/tools/utility/QrBarcode.jsx` with text/URL/contact input, customization options, image upload for decoding, barcode format selector
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 19.3 Implement password generator
    - Create `src/utils/passwordGenerator.js` with:
      - Random password generation (8–128 chars, configurable character sets)
      - Passphrase generation (random dictionary words, configurable count and separator)
      - Strength indicator (Weak/Fair/Strong/Very Strong)
      - All generation client-side, no server transmission
    - Create `src/components/tools/security/PasswordGenerator.jsx` with length slider, character toggles, passphrase mode, strength meter, copy-to-clipboard
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6_

  - [ ] 19.4 Implement file checksum calculator
    - Create `src/utils/checksumWorker.js` as Web Worker computing MD5, SHA-1, SHA-256 checksums client-side
    - Support files up to 500MB, compare against expected checksum value
    - Create `src/components/tools/security/ChecksumCalculator.jsx` with file upload, checksum display, expected value comparison (match/mismatch)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 19.5 Implement SEO analyzer
    - Create `server/services/seoService.js` for URL fetching and analysis (meta tags, heading structure, image alt text, link structure, keyword density, readability, content length)
    - Calculate SEO score 0–100 with actionable suggestions
    - Generate Open Graph and Twitter Card meta tag snippets
    - Create `server/routes/seo.js` with `POST /api/seo/analyze`
    - Create `src/components/tools/seo/SeoAnalyzer.jsx` with URL input, text content input, score display, suggestions list, meta tag snippet generator
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 20. OCR tool
  - [x] 20.1 Implement OCR service and route
    - Create `server/services/ocrService.js` using Tesseract.js supporting English, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Hindi, Arabic
    - Preserve paragraph structure and line breaks
    - Create `server/routes/ocr.js` with `POST /api/ocr/extract`
    - Create `src/components/tools/text/OcrExtractor.jsx` with image/PDF upload, language selector, editable text output, copy-to-clipboard, download as TXT/DOCX, low-quality warning
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

- [ ] 21. Checkpoint — Design, utility, and OCR tools
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Accessibility and responsive polish
  - [ ] 22.1 Implement accessibility across all components
    - Add ARIA labels and roles to all interactive components
    - Ensure full keyboard navigation for all tools
    - Add screen reader announcements for dynamic content (processing status, errors, results)
    - Add visible focus indicators for all focusable elements
    - Verify color contrast meets WCAG 2.1 Level AA
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 17.7_

  - [ ] 22.2 Implement mobile/tablet responsive polish
    - Ensure touch-based drag-and-drop for file uploads on mobile/tablet
    - Implement pinch-to-zoom on image and PDF previews
    - Implement lazy-loading for tool assets and images
    - Verify all workflows functional on iOS Safari and Android Chrome
    - _Requirements: 31.2, 31.4, 31.5, 31.7_

  - [ ]* 22.3 Write property test for batch concurrency
    - **Property 29: Batch concurrency limit** — verify no more than C files processed simultaneously during batch operations
    - **Validates: Requirements 19.5**

- [ ] 23. Checkpoint — Accessibility and responsive
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 24. Wire all tools into routing and tool registry
  - [ ] 24.1 Register all tools in toolRegistry.js
    - Add all tool definitions (40+ tools) with correct id, name, description, category, keywords, path, icon, isClientSide, maxFileSize, maxBatchSize, supportedFormats
    - Verify all categories used: image, document, text, developer, media, ai, student, design, security, seo, utility
    - _Requirements: 17.2, 17.5_

  - [ ] 24.2 Wire all tool components into React Router
    - Add routes for every tool component in App.jsx
    - Ensure ToolPage wrapper renders related tools sidebar for each tool
    - Verify navigation from HomePage → CategoryPage → ToolPage works for all tools
    - _Requirements: 17.4, 17.5_

- [ ] 25. E2E tests
  - [ ]* 25.1 Write E2E test for image workflow
    - Upload image → convert format → download (happy path)
    - Verify progress indicator, preview, and download link
    - _Requirements: 1.1, 19.1_

  - [ ]* 25.2 Write E2E test for PDF merge workflow
    - Upload multiple PDFs → reorder → merge → download
    - _Requirements: 4.2_

  - [ ]* 25.3 Write E2E test for tool discovery
    - Search for a tool → navigate → verify tool page loads
    - Test category navigation and recently used tools
    - _Requirements: 17.1, 17.3_

  - [ ]* 25.4 Write E2E test for mobile experience
    - Mobile viewport: hamburger menu, touch upload, responsive layout
    - Verify single-column layout, touch targets, collapsible menu
    - _Requirements: 17.8, 31.1, 31.3_

  - [ ]* 25.5 Write E2E test for accessibility
    - Keyboard navigation through tool discovery
    - Screen reader landmarks and ARIA labels
    - _Requirements: 22.2, 22.3, 17.7_

- [ ] 26. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each major domain
- Property tests validate the 29 correctness properties from the design document
- Client-side tools (text, color, calculator, GPA, timer, flashcards, checksum, password) require no server round-trips (Requirement 19.4)
- All file processing tools enforce session isolation (Requirement 16.3) and 24-hour cleanup (Requirement 15.1)
