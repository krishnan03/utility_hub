# Contributing to All-in-One Utility Hub

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Getting Started

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Run tests: `npm test`
6. Push and open a pull request

## Code Style

### General

- Use **ES modules** (`import`/`export`) throughout the project
- Use `const` by default, `let` when reassignment is needed, never `var`
- Prefer arrow functions for callbacks and inline functions
- Use template literals over string concatenation
- Keep files focused — one component or module per file

### Frontend (client/)

- Write **functional React components** with hooks (no class components)
- Use **Tailwind CSS** for all styling — avoid inline styles and CSS modules
- Use **Zustand** for shared state management
- Use **Framer Motion** for animations
- Name components in PascalCase: `ImageConverter.jsx`
- Name utilities and hooks in camelCase: `useFileUpload.js`, `textUtils.js`
- Co-locate tests with source files using `.test.js` or `.test.jsx` suffix

### Backend (server/)

- Use **Express** with standard middleware patterns
- Keep route handlers thin — delegate logic to service modules
- Use custom error classes from `server/utils/errors.js`
- Name files in camelCase: `imageService.js`, `errorHandler.js`

## Branching Strategy

- **`main`** — production-ready code, always deployable
- **`feature/<name>`** — new features (branch from `main`)
- **`fix/<name>`** — bug fixes (branch from `main`)
- **`docs/<name>`** — documentation changes

All work happens on feature/fix branches and merges into `main` via pull request.

## Commit Messages

Use clear, descriptive commit messages following this format:

```
<type>: <short description>

[optional body with more detail]
```

Types:
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation changes
- `style` — formatting, no logic change
- `refactor` — code restructuring without behavior change
- `test` — adding or updating tests
- `chore` — build config, dependencies, tooling

Examples:
```
feat: add image watermark batch processing
fix: handle corrupted PDF upload gracefully
test: add property tests for PDF merge page count
docs: update README with Docker SSL instructions
```

## Pull Request Guidelines

1. **One concern per PR** — keep changes focused and reviewable
2. **Write a clear description** — explain what changed and why
3. **Reference related issues** — link to any relevant issues or tasks
4. **All tests must pass** — run `npm test` and `npm run test:e2e` before submitting
5. **Maintain coverage** — aim for ≥80% test coverage; don't reduce existing coverage
6. **No console.log in production code** — use proper error handling instead
7. **Update documentation** — if your change affects setup, usage, or APIs, update the README

## Testing Requirements

- **Unit tests** — write tests for all new functions and components using Vitest
- **Property-based tests** — use fast-check for testing invariants across many inputs
- **E2E tests** — add Playwright tests for new user-facing workflows
- **React components** — test with React Testing Library, focusing on user behavior over implementation details

Run the full test suite before submitting:

```bash
npm test                # Unit tests (client + server)
npm run test:coverage   # With coverage report
npm run test:e2e        # Playwright E2E tests
```

## Adding a New Tool

1. Decide if the tool is **client-side** (text, color, calculator) or **server-side** (file processing)
2. For server-side tools:
   - Add a service in `server/services/`
   - Add routes in `server/routes/`
   - Register the route in the Express app
3. For all tools:
   - Create the component in `client/src/components/tools/<category>/`
   - Register the tool in `client/src/lib/toolRegistry.js`
   - Add a route in `client/src/App.jsx`
4. Write unit tests and property-based tests
5. Update the README features list if applicable

## Reporting Issues

- Use GitHub Issues to report bugs or request features
- Include steps to reproduce, expected behavior, and actual behavior
- Attach screenshots or error logs when relevant

## Code of Conduct

Be respectful and constructive. We're all here to build something useful together.
