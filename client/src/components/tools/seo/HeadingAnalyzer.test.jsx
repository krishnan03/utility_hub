import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeadingAnalyzer from './HeadingAnalyzer';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...filterMotionProps(props)}>{children}</div>,
    button: ({ children, ...props }) => <button {...filterMotionProps(props)}>{children}</button>,
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

const GOOD_HTML = `<h1>Main Title</h1>
<h2>Section One</h2>
<h3>Subsection A</h3>
<h3>Subsection B</h3>
<h2>Section Two</h2>`;

const BAD_HTML = `<h1>Title One</h1>
<h1>Title Two</h1>
<h4>Skipped to H4</h4>
<h3></h3>
<h2>A very long heading that exceeds seventy characters in total length to trigger the info warning about heading length</h2>
<h2>Duplicate</h2>
<h2>Duplicate</h2>`;

describe('HeadingAnalyzer', () => {
  it('renders with paste mode by default', () => {
    render(<HeadingAnalyzer />);
    expect(screen.getByPlaceholderText('Paste your HTML here...')).toBeInTheDocument();
    expect(screen.getByText('Analyze Headings')).toBeInTheDocument();
  });

  it('switches to URL mode', () => {
    render(<HeadingAnalyzer />);
    fireEvent.click(screen.getByText('Enter URL'));
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
  });

  it('shows error when analyzing empty input', () => {
    render(<HeadingAnalyzer />);
    fireEvent.click(screen.getByText('Analyze Headings'));
    expect(screen.getByText('Please paste some HTML to analyze')).toBeInTheDocument();
  });

  it('analyzes well-structured HTML and shows good score', () => {
    render(<HeadingAnalyzer />);
    const textarea = screen.getByPlaceholderText('Paste your HTML here...');
    fireEvent.change(textarea, { target: { value: GOOD_HTML } });
    fireEvent.click(screen.getByText('Analyze Headings'));

    // Should show heading count
    expect(screen.getByText(/5 headings found/)).toBeInTheDocument();
    // Should show hierarchy section
    expect(screen.getByText('Heading Hierarchy')).toBeInTheDocument();
    // Should show distribution
    expect(screen.getByText('Distribution')).toBeInTheDocument();
  });

  it('detects multiple H1 tags', () => {
    render(<HeadingAnalyzer />);
    const textarea = screen.getByPlaceholderText('Paste your HTML here...');
    fireEvent.change(textarea, { target: { value: BAD_HTML } });
    fireEvent.click(screen.getByText('Analyze Headings'));

    expect(screen.getByText(/Multiple H1 tags found/)).toBeInTheDocument();
  });

  it('detects skipped heading levels', () => {
    render(<HeadingAnalyzer />);
    const textarea = screen.getByPlaceholderText('Paste your HTML here...');
    fireEvent.change(textarea, { target: { value: '<h1>Title</h1><h3>Skipped H2</h3>' } });
    fireEvent.click(screen.getByText('Analyze Headings'));

    expect(screen.getByText(/Skipped heading level/)).toBeInTheDocument();
  });

  it('detects missing H1', () => {
    render(<HeadingAnalyzer />);
    const textarea = screen.getByPlaceholderText('Paste your HTML here...');
    fireEvent.change(textarea, { target: { value: '<h2>No H1 here</h2><h3>Sub</h3>' } });
    fireEvent.click(screen.getByText('Analyze Headings'));

    expect(screen.getByText(/Missing H1 tag/)).toBeInTheDocument();
  });

  it('detects empty headings', () => {
    render(<HeadingAnalyzer />);
    const textarea = screen.getByPlaceholderText('Paste your HTML here...');
    fireEvent.change(textarea, { target: { value: '<h1>Title</h1><h2></h2>' } });
    fireEvent.click(screen.getByText('Analyze Headings'));

    expect(screen.getByText(/Empty h2 tag found/)).toBeInTheDocument();
  });

  it('detects duplicate headings', () => {
    render(<HeadingAnalyzer />);
    const textarea = screen.getByPlaceholderText('Paste your HTML here...');
    fireEvent.change(textarea, { target: { value: '<h1>Title</h1><h2>Same</h2><h2>Same</h2>' } });
    fireEvent.click(screen.getByText('Analyze Headings'));

    expect(screen.getByText(/Duplicate heading/)).toBeInTheDocument();
  });

  it('loads sample HTML', () => {
    render(<HeadingAnalyzer />);
    fireEvent.click(screen.getByText('Load sample'));
    const textarea = screen.getByPlaceholderText('Paste your HTML here...');
    expect(textarea.value).toContain('<h1>');
  });

  it('resets analysis', () => {
    render(<HeadingAnalyzer />);
    const textarea = screen.getByPlaceholderText('Paste your HTML here...');
    fireEvent.change(textarea, { target: { value: GOOD_HTML } });
    fireEvent.click(screen.getByText('Analyze Headings'));

    // Results should be visible
    expect(screen.getByText('Heading Hierarchy')).toBeInTheDocument();

    // Click reset
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.queryByText('Heading Hierarchy')).not.toBeInTheDocument();
  });

  it('shows no headings error for HTML without headings', () => {
    render(<HeadingAnalyzer />);
    const textarea = screen.getByPlaceholderText('Paste your HTML here...');
    fireEvent.change(textarea, { target: { value: '<p>No headings here</p>' } });
    fireEvent.click(screen.getByText('Analyze Headings'));

    expect(screen.getByText(/No headings found/)).toBeInTheDocument();
  });
});
