import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => {
  const cache = new Map();
  return {
    motion: new Proxy({}, {
      get: (_, tag) => {
        if (!cache.has(tag)) {
          const Component = ({ children, initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, variants, ...rest }) => {
            const Tag = typeof tag === 'string' ? tag : 'div';
            return <Tag {...rest}>{children}</Tag>;
          };
          Component.displayName = `motion.${String(tag)}`;
          cache.set(tag, Component);
        }
        return cache.get(tag);
      },
    }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

import DownloadButton from './DownloadButton.jsx';

describe('DownloadButton', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders download button with filename', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    render(<DownloadButton downloadUrl="/file" filename="photo.png" expiresAt={future} />);
    const btn = screen.getByRole('button', { name: /download photo\.png/i });
    expect(btn).toBeInTheDocument();
    expect(screen.getByText('photo.png')).toBeInTheDocument();
  });

  it('shows countdown timer', () => {
    const future = new Date(Date.now() + 3661000).toISOString(); // ~1h 1m 1s
    render(<DownloadButton downloadUrl="/file" filename="test.pdf" expiresAt={future} />);
    expect(screen.getByText(/auto-deletes in/i)).toBeInTheDocument();
    expect(screen.getByText(/01:01/)).toBeInTheDocument();
  });

  it('shows expired state when time has passed', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    render(<DownloadButton downloadUrl="/file" filename="old.zip" expiresAt={past} />);
    const btn = screen.getByRole('button', { name: /download old\.zip/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/link expired/i)).toBeInTheDocument();
  });

  it('disables button when countdown reaches zero', async () => {
    const future = new Date(Date.now() + 2000).toISOString(); // 2 seconds
    render(<DownloadButton downloadUrl="/file" filename="test.txt" expiresAt={future} />);

    const btn = screen.getByRole('button', { name: /download test\.txt/i });
    expect(btn).not.toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
    expect(screen.getByText(/link expired/i)).toBeInTheDocument();
  });

  it('triggers download on click when not expired', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    render(<DownloadButton downloadUrl="/api/files/123/download" filename="result.png" expiresAt={future} />);

    // Mock createElement to capture the anchor click
    const clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreate(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    const btn = screen.getByRole('button', { name: /download result\.png/i });
    await userEvent.click(btn);

    expect(clickSpy).toHaveBeenCalled();
    document.createElement.mockRestore();
  });

  it('has accessible aria-label with filename', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    render(<DownloadButton downloadUrl="/file" filename="report.csv" expiresAt={future} />);
    expect(screen.getByRole('button', { name: /download report\.csv/i })).toBeInTheDocument();
  });
});
