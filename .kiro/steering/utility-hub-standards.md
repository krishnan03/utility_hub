---
inclusion: always
---

# ToolPilot — Engineering & Design Standards

These standards apply to ALL work on the ToolPilot project. Never compromise on these.

## UI/UX Excellence

- Every tool page must feel premium — CRED-app level polish
- Animations must be smooth (60fps), purposeful, and never block interaction
- Use Framer Motion for all transitions — fade-in on load, spring animations on interactive elements
- Every tool follows the 3-step guided flow: Upload → Configure → Result
- File upload zones must have drag-and-drop with visual feedback (pulse, glow, icon lift)
- Download results must feel celebratory (success icon, gradient card, countdown timer)
- All interactive elements must have hover states with micro-interactions (scale, glow, color shift)
- Touch targets minimum 44x44px on mobile
- Dark mode is the default — light mode is secondary
- Glass-morphism cards with backdrop blur for depth
- Gradient accents (primary-500 to primary-400) for CTAs and highlights
- Typography: Inter for body, bold/extrabold for headings, mono for code/numbers
- Spacing: generous — never cramped. Use space-y-6 minimum between sections

## Performance

- Client-side processing for all text, color, calculator, and data transformation tools — zero server round-trips
- Lazy-load tool components with React.lazy and Suspense
- Images and heavy assets must be lazy-loaded
- Target: landing page loads in under 3 seconds on broadband
- Use Web Workers for CPU-intensive client-side operations (checksums, large file parsing)
- Debounce all real-time inputs (search, live preview) at 150ms minimum
- Batch file processing must show individual progress per file
- Never block the main thread — use requestAnimationFrame for animations

## Security & Privacy

- No user accounts, no tracking, no analytics cookies
- All uploaded files auto-delete within 24 hours — show countdown on every download
- Session isolation: users cannot access each other's files (UUID session cookies)
- File sanitization: validate MIME types, reject dangerous extensions (.exe, .sh, .php, etc.)
- All file transfers over TLS (enforced by Nginx in production)
- Files encrypted at rest with AES-256
- Rate limiting on all API endpoints (100 req/15min default)
- Client-side tools must NEVER transmit data to the server (passwords, checksums, calculators)
- Display "Your data is auto-deleted in 24h" prominently in the footer

## Code Quality

- ES modules throughout (import/export)
- Functional React components only — no class components
- Zustand for state management — keep stores minimal and focused
- Tailwind CSS for all styling — no inline styles, no CSS modules
- Every new tool must have unit tests (Vitest) covering happy path and error cases
- Server services must have integration tests with supertest
- Error handling: every API returns consistent JSON `{ success, error: { code, message } }`
- Custom error classes (ValidationError, ProcessingError, NotFoundError, ForbiddenError)

## Git Workflow

- NEVER auto-push to remote. Only commit locally.
- ALWAYS ask the user "Ready to push?" before running `git push`.
- Batch related changes into a single commit when possible — avoid noisy commit history.

## Tool Discovery

- Every tool must be registered in `client/src/lib/toolRegistry.js` with id, name, description, category, keywords, path, icon
- Search must match against name, description, AND keywords (case-insensitive)
- Category pages must show tool previews (first 3 tools listed)
- Related tools sidebar on every tool page
- Recently used tools tracked in localStorage (max 10, MRU order)
- Quick action pills on homepage for the 8 most popular tools
