import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PageSpeedInsights from './PageSpeedInsights';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...filterMotionProps(props)}>{children}</div>,
    circle: (props) => <circle {...filterSvgMotionProps(props)} />,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

function filterMotionProps(props) {
  const filtered = { ...props };
  delete filtered.initial;
  delete filtered.animate;
  delete filtered.exit;
  delete filtered.transition;
  delete filtered.whileHover;
  delete filtered.whileTap;
  return filtered;
}

function filterSvgMotionProps(props) {
  const filtered = { ...props };
  delete filtered.initial;
  delete filtered.animate;
  delete filtered.transition;
  return filtered;
}

// Mock API response
const mockApiResponse = {
  lighthouseResult: {
    categories: { performance: { score: 0.85 } },
    audits: {
      'largest-contentful-paint': { displayValue: '2.1 s', score: 0.7, description: 'LCP measures loading.' },
      'total-blocking-time': { displayValue: '150 ms', score: 0.9, description: 'TBT measures interactivity.' },
      'cumulative-layout-shift': { displayValue: '0.05', score: 0.95, description: 'CLS measures visual stability.' },
      'first-contentful-paint': { displayValue: '1.2 s', score: 0.85, description: 'FCP measures first paint.' },
      'speed-index': { displayValue: '3.0 s', score: 0.6, description: 'Speed Index shows content visibility.' },
      'interactive': { displayValue: '4.5 s', score: 0.5, description: 'TTI measures full interactivity.' },
      'render-blocking-resources': {
        title: 'Eliminate render-blocking resources',
        description: 'Remove render-blocking JS and CSS.',
        score: 0.3,
        details: { type: 'opportunity', overallSavingsMs: 500 },
      },
      'uses-responsive-images': {
        title: 'Properly size images',
        description: 'Serve appropriately-sized images.',
        score: 0.5,
        details: { type: 'opportunity', overallSavingsMs: 200 },
      },
      'dom-size': {
        title: 'Avoid excessive DOM size',
        description: 'Large DOM can slow performance.',
        displayValue: '1,500 elements',
        score: 0.4,
        details: { type: 'table' },
      },
    },
  },
};

describe('PageSpeedInsights', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders URL input and analyze button', () => {
    render(<PageSpeedInsights />);
    expect(screen.getByPlaceholderText(/Enter URL to analyze/)).toBeInTheDocument();
    expect(screen.getByText('⚡ Analyze')).toBeInTheDocument();
  });

  it('shows mobile and desktop toggle', () => {
    render(<PageSpeedInsights />);
    expect(screen.getByText(/Mobile/)).toBeInTheDocument();
    expect(screen.getByText(/Desktop/)).toBeInTheDocument();
  });

  it('disables analyze button when URL is empty', () => {
    render(<PageSpeedInsights />);
    const btn = screen.getByText('⚡ Analyze');
    expect(btn).toBeDisabled();
  });

  it('shows error for invalid URL', async () => {
    render(<PageSpeedInsights />);
    const input = screen.getByPlaceholderText(/Enter URL to analyze/);
    fireEvent.change(input, { target: { value: 'not a url !!!' } });
    fireEvent.click(screen.getByText('⚡ Analyze'));
    expect(screen.getByText(/Please enter a valid URL/)).toBeInTheDocument();
  });

  it('fetches and displays results on successful analysis', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<PageSpeedInsights />);
    const input = screen.getByPlaceholderText(/Enter URL to analyze/);
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(screen.getByText('⚡ Analyze'));

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    // Core Web Vitals
    expect(screen.getByText('Core Web Vitals')).toBeInTheDocument();
    expect(screen.getByText('2.1 s')).toBeInTheDocument();
    expect(screen.getByText('150 ms')).toBeInTheDocument();
    expect(screen.getByText('0.05')).toBeInTheDocument();
  });

  it('shows opportunities section', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<PageSpeedInsights />);
    const input = screen.getByPlaceholderText(/Enter URL to analyze/);
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(screen.getByText('⚡ Analyze'));

    await waitFor(() => {
      expect(screen.getByText(/Opportunities/)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'Internal server error' } }),
    });

    render(<PageSpeedInsights />);
    const input = screen.getByPlaceholderText(/Enter URL to analyze/);
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(screen.getByText('⚡ Analyze'));

    await waitFor(() => {
      expect(screen.getByText(/Internal server error/)).toBeInTheDocument();
    });
  });

  it('auto-prepends https:// to bare domains', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<PageSpeedInsights />);
    const input = screen.getByPlaceholderText(/Enter URL to analyze/);
    fireEvent.change(input, { target: { value: 'example.com' } });
    fireEvent.click(screen.getByText('⚡ Analyze'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https%3A%2F%2Fexample.com'),
        expect.any(Object),
      );
    });
  });

  it('switches strategy between mobile and desktop', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<PageSpeedInsights />);
    const input = screen.getByPlaceholderText(/Enter URL to analyze/);
    fireEvent.change(input, { target: { value: 'https://example.com' } });

    // Click desktop
    fireEvent.click(screen.getByText(/Desktop/));
    fireEvent.click(screen.getByText('⚡ Analyze'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('strategy=desktop'),
        expect.any(Object),
      );
    });
  });

  it('shows loading state during analysis', async () => {
    let resolvePromise;
    fetch.mockReturnValueOnce(new Promise((resolve) => { resolvePromise = resolve; }));

    render(<PageSpeedInsights />);
    const input = screen.getByPlaceholderText(/Enter URL to analyze/);
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(screen.getByText('⚡ Analyze'));

    // After click, button should show loading text
    await waitFor(() => {
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });

    // Resolve to clean up
    resolvePromise({ ok: true, json: () => Promise.resolve(mockApiResponse) });
    await waitFor(() => {
      expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
    });
  });

  it('triggers analysis on Enter key', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    render(<PageSpeedInsights />);
    const input = screen.getByPlaceholderText(/Enter URL to analyze/);
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
