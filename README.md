# All-in-One Utility Hub

A free, open-source web application providing 40+ browser-based utilities in a single place. Convert images, manipulate PDFs, transform data, generate passwords, calculate GPAs, and much more — all without installing desktop software.

Built with a CRED-inspired UI featuring dark/light themes, responsive design, and smooth animations.

## Features

- **Image Tools** — Format conversion, compression, resize, crop, rotate, watermark, background removal
- **PDF Tools** — Merge, split, compress, reorder, rotate, watermark, password protect, e-signature
- **Document Conversion** — Markdown, HTML, plain text, CSV, XLSX
- **Text Utilities** — Case conversion, encoding/decoding, hashing, diff, find-replace, summarizer
- **Developer Tools** — JSON/YAML/XML formatting and conversion, JWT decoder, regex tester, cron parser, timestamp converter
- **Media Tools** — Audio and video format conversion, GIF maker
- **AI Detection** — Text and image AI-content analysis
- **Student Tools** — GPA calculator, citation generator, flashcards, Pomodoro timer, LaTeX renderer, scientific calculator, essay outliner
- **Design Tools** — Color converter, palette generator, contrast checker, meme generator, favicon generator
- **Security** — Password generator, file checksum calculator
- **Utilities** — Unit converter, currency converter, QR/barcode generator, SEO analyzer

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, Framer Motion, Axios |
| Backend | Node.js, Express, sharp, pdf-lib, fluent-ffmpeg, Tesseract.js |
| Testing | Vitest, React Testing Library, Playwright, fast-check |
| Deployment | Docker Compose, Nginx reverse proxy |

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Docker** and **Docker Compose** (for containerized deployment)
- **ffmpeg** (for local media conversion — installed automatically in Docker)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/all-in-one-utility-hub.git
cd all-in-one-utility-hub
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for both `client/` and `server/` workspaces.

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` as needed. All variables have sensible defaults — see [Environment Variables](#environment-variables) below.

### 4. Start development servers

```bash
# Start the React dev server (http://localhost:5173)
npm run dev:client

# In a separate terminal, start the Express API server
npm run dev:server
```

### 5. Build for production

```bash
npm run build:client
npm run build:server
```

## Docker Deployment

Deploy the entire stack with a single command:

```bash
# Copy and configure environment
cp .env.example .env

# Build and start all services
docker compose up -d --build
```

This starts three containers:
- **client** — Nginx serving the built React app
- **server** — Node.js Express API with ffmpeg
- **nginx** — Reverse proxy routing `/api/*` to the server and everything else to the client

The app is available at `http://localhost` (port 80 by default).

To stop:

```bash
docker compose down
```

For SSL/HTTPS, uncomment the SSL sections in `nginx/nginx.conf` and `docker-compose.yml`, then provide your certificates.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | Environment mode |
| `SERVER_PORT` | `3001` | Express server port |
| `UPLOAD_DIR` | `/app/uploads` | Temporary file storage path |
| `MAX_FILE_SIZE` | `104857600` | Max upload size in bytes (100 MB) |
| `FILE_EXPIRY_HOURS` | `24` | Hours before auto-deletion |
| `CLEANUP_INTERVAL` | `0 * * * *` | Cron schedule for cleanup job |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP |
| `HOST_PORT` | `80` | Host port for Nginx |

## Testing

```bash
# Run all unit tests
npm test

# Run client tests only
npm run test:client

# Run server tests only
npm run test:server

# Run tests with coverage (≥80% threshold)
npm run test:coverage

# Run Playwright E2E tests
npm run test:e2e

# Run E2E tests with interactive UI
npm run test:e2e:ui
```

## Project Structure

```
all-in-one-utility-hub/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # UI components (layout, tools, common, pages)
│   │   ├── stores/         # Zustand state stores
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Client-side utility functions
│   │   └── lib/            # API client, tool registry
│   ├── Dockerfile
│   └── package.json
├── server/                 # Express backend
│   ├── config/             # Environment config
│   ├── middleware/          # Upload, validation, rate limiting, error handling
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic (image, PDF, media, etc.)
│   ├── utils/              # Helpers and custom errors
│   ├── Dockerfile
│   └── package.json
├── e2e/                    # Playwright E2E tests
├── nginx/                  # Nginx reverse proxy config
├── docker-compose.yml
├── playwright.config.js
├── .env.example
└── package.json            # Root workspace config
```

## License

This project is licensed under the [MIT License](LICENSE).
