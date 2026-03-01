# ToolsPilot — Free Online Tools for Everyone

🌐 **Live Site:** [https://toolspilot.work](https://toolspilot.work)

159+ free online tools — PDF editor, Excel editor, Word editor, image converter, developer tools, finance calculators and more. No signup required. Your data is auto-deleted in 24 hours.

Built with a premium dark-mode UI featuring glassmorphism, smooth animations, and mobile-first responsive design.

## Features

- **Image Tools** — Format conversion, compression, resize, crop, background removal, HEIC to JPG, SVG to PNG
- **PDF Tools** — Merge, split, compress, reorder, rotate, watermark, protect, e-signature, OCR, redact, crop
- **Document Editors** — Full PDF editor, Word editor (DOCX), Excel editor with formulas
- **Text & Writing** — Markdown editor, summarizer, grammar checker, paraphraser, OCR, Morse code, Braille
- **Developer Tools** — JSON/YAML/XML formatter, JWT decoder, regex tester, cron parser, SQL formatter, diff checker, API builder
- **Media Tools** — Audio/video conversion, GIF maker, video compressor
- **Finance** — Compound interest, EMI, SIP, tax, options calculator, crypto/currency converter
- **AI Tools** — AI content detector, sentiment analyzer
- **Student Tools** — GPA calculator, citation generator, flashcards, LaTeX renderer, scientific/graphing calculator, math solver
- **Design Tools** — Color tools, meme generator, favicon generator, color blindness simulator
- **Security** — Password generator, hash generator, file encryption, TOTP, breach checker
- **SEO Tools** — SEO analyzer, meta tag generator, sitemap generator, page speed insights
- **Utilities** — Unit converter, QR/barcode generator, age/date calculator, world clock, typing speed test

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, Framer Motion |
| Backend | Node.js, Express, sharp, pdf-lib, fluent-ffmpeg, Tesseract.js |
| Testing | Vitest, React Testing Library, Playwright |
| Deployment | Docker Compose, Nginx, GitHub Actions CI/CD |
| Analytics | Umami (privacy-first, cookie-free) |

## Quick Start

```bash
# Clone
git clone https://github.com/krishnan03/utility_hub.git
cd utility_hub

# Install dependencies
npm install

# Start development
npm run dev:client    # React dev server → http://localhost:5173
npm run dev:server    # Express API → http://localhost:3001
```

## Docker Deployment

```bash
cp .env.example .env
docker compose up -d --build
```

This starts the full stack (client + server + Umami analytics) at `http://localhost`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | Environment mode |
| `SERVER_PORT` | `3001` | Express server port |
| `UPLOAD_DIR` | `/app/uploads` | Temporary file storage path |
| `MAX_FILE_SIZE` | `104857600` | Max upload size in bytes (100 MB) |
| `FILE_EXPIRY_HOURS` | `24` | Hours before auto-deletion |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `RATE_LIMIT_MAX` | `100` | Max requests per 15 min per IP |

> **Note:** The `docker-compose.yml` includes default Umami DB credentials for local development. Change these in production.

## Testing

```bash
npm test                # All unit tests (821 tests)
npm run test:client     # Client tests only
npm run test:e2e        # Playwright E2E tests
npm run test:coverage   # Coverage report (≥80% threshold)
```

## Project Structure

```
utility_hub/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # UI components (layout, tools, common, pages)
│   │   ├── stores/         # Zustand state stores
│   │   ├── utils/          # Client-side utility functions
│   │   └── lib/            # API client, tool registry, blog content
│   └── public/             # Static assets, sitemap, robots.txt, llms.txt
├── server/                 # Express backend
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic (image, PDF, media processing)
│   └── middleware/         # Upload, validation, rate limiting, errors
├── e2e/                    # Playwright E2E tests
├── docker-compose.yml
├── .env.example
└── .github/workflows/      # CI/CD pipeline
```

## Privacy

- No user accounts, no tracking cookies
- All uploaded files auto-deleted within 24 hours
- Client-side tools never transmit data to the server
- Files encrypted at rest with AES-256
- Rate limiting on all API endpoints

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-tool`)
3. Commit your changes (`git commit -m 'feat: add amazing tool'`)
4. Push to the branch (`git push origin feature/amazing-tool`)
5. Open a Pull Request

## License

[MIT License](LICENSE) — free to use, modify, and distribute.

---

Built with ♥ by [ToolsPilot](https://toolspilot.work)
