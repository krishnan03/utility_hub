import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerServiceWorker } from './registerSW.js';

describe('registerServiceWorker', () => {
  let originalNavigator;
  let addEventListenerSpy;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers service worker on load when supported', () => {
    const mockRegister = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: mockRegister },
      configurable: true,
      writable: true,
    });

    registerServiceWorker();

    expect(addEventListenerSpy).toHaveBeenCalledWith('load', expect.any(Function));

    // Simulate load event
    const loadHandler = addEventListenerSpy.mock.calls.find((c) => c[0] === 'load')[1];
    loadHandler();

    expect(mockRegister).toHaveBeenCalledWith('/sw.js');
  });

  it('does not throw when serviceWorker is not supported', () => {
    const original = navigator.serviceWorker;
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(() => registerServiceWorker()).not.toThrow();

    Object.defineProperty(navigator, 'serviceWorker', {
      value: original,
      configurable: true,
      writable: true,
    });
  });

  it('handles registration failure gracefully', async () => {
    const mockRegister = vi.fn().mockRejectedValue(new Error('SW failed'));
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: mockRegister },
      configurable: true,
      writable: true,
    });

    registerServiceWorker();

    const loadHandler = addEventListenerSpy.mock.calls.find((c) => c[0] === 'load')[1];
    // Should not throw even when registration fails
    expect(() => loadHandler()).not.toThrow();
  });
});
