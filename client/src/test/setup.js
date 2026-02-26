import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';

// Polyfill crypto.subtle for jsdom (needed for hash generation tests in CI)
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = webcrypto;
}

// Mock window.matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
