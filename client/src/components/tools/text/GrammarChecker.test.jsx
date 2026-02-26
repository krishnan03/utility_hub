import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GrammarChecker from './GrammarChecker';

// Mock framer-motion
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

// Mock textUtils
vi.mock('../../../utils/textUtils', () => ({
  countWords: (text) => text.trim().split(/\s+/).filter(Boolean).length,
  fleschKincaidGrade: () => 8,
  gradeLabel: () => '8th Grade (Middle School)',
}));

function typeAndWait(text) {
  const textarea = screen.getByPlaceholderText(/Start typing or paste your text/);
  fireEvent.change(textarea, { target: { value: text } });
  act(() => { vi.advanceTimersByTime(350); });
}

describe('GrammarChecker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders textarea and placeholder', () => {
    render(<GrammarChecker />);
    expect(screen.getByPlaceholderText(/Start typing or paste your text/)).toBeInTheDocument();
  });

  it('shows no issues for clean text after debounce', () => {
    render(<GrammarChecker />);
    typeAndWait('This is a clean sentence.');
    expect(screen.getByText(/No issues found/)).toBeInTheDocument();
  });

  it('detects misspellings in real-time', () => {
    render(<GrammarChecker />);
    typeAndWait('I recieve the teh package.');
    expect(screen.getByText(/Misspelling: "recieve"/)).toBeInTheDocument();
    expect(screen.getByText(/Misspelling: "teh"/)).toBeInTheDocument();
  });

  it('detects repeated words', () => {
    render(<GrammarChecker />);
    typeAndWait('The the cat sat on the mat.');
    expect(screen.getByText(/Repeated word/)).toBeInTheDocument();
  });

  it('detects subject-verb agreement errors', () => {
    render(<GrammarChecker />);
    typeAndWait("He don't like that.");
    expect(screen.getByText(/Subject-verb agreement/)).toBeInTheDocument();
  });

  it('detects missing comma after introductory phrases', () => {
    render(<GrammarChecker />);
    typeAndWait('However the plan failed.');
    expect(screen.getByText(/Missing comma after/)).toBeInTheDocument();
  });

  it('detects sentences not starting with capital letter', () => {
    render(<GrammarChecker />);
    typeAndWait('this is wrong.');
    expect(screen.getByText(/Sentence should start with a capital letter/)).toBeInTheDocument();
  });

  it('shows statistics bar with word count', () => {
    render(<GrammarChecker />);
    typeAndWait('Hello world test.');
    expect(screen.getByText(/3 words/)).toBeInTheDocument();
  });

  it('shows Fix All button when fixable issues exist', () => {
    render(<GrammarChecker />);
    typeAndWait('I recieve the teh package.');
    expect(screen.getByText(/Fix All/)).toBeInTheDocument();
  });

  it('applies all fixes when Fix All is clicked', () => {
    render(<GrammarChecker />);
    typeAndWait('I recieve the teh package.');
    act(() => { fireEvent.click(screen.getByText(/Fix All/)); });
    act(() => { vi.advanceTimersByTime(350); });
    const textarea = screen.getByPlaceholderText(/Start typing or paste your text/);
    expect(textarea.value).toContain('receive');
    expect(textarea.value).toContain('the');
  });

  it('shows highlighted preview section when issues exist', () => {
    render(<GrammarChecker />);
    typeAndWait('I recieve it.');
    expect(screen.getByText('Highlighted Preview')).toBeInTheDocument();
  });

  it('groups issues by type in collapsible sections', () => {
    render(<GrammarChecker />);
    typeAndWait('I recieve the teh package.  Extra spaces.');
    expect(screen.getByText('Spelling')).toBeInTheDocument();
    expect(screen.getByText('Style')).toBeInTheDocument();
  });

  it('detects passive voice', () => {
    render(<GrammarChecker />);
    typeAndWait('The ball was thrown by the boy.');
    expect(screen.getByText(/Passive voice/)).toBeInTheDocument();
  });

  it('debounces input — no results before 300ms', () => {
    render(<GrammarChecker />);
    const textarea = screen.getByPlaceholderText(/Start typing or paste your text/);
    fireEvent.change(textarea, { target: { value: 'I recieve it.' } });
    // Before debounce fires
    expect(screen.queryByText('Highlighted Preview')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(350); });
    expect(screen.getByText('Highlighted Preview')).toBeInTheDocument();
  });
});
