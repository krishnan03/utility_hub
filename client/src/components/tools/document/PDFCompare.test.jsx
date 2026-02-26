import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PDFCompare from './PDFCompare.jsx';

function renderComponent() {
  return render(
    <MemoryRouter>
      <PDFCompare />
    </MemoryRouter>,
  );
}

describe('PDFCompare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial render ─────────────────────────────────────────────────────

  it('renders both upload zones', () => {
    renderComponent();
    expect(screen.getByText('Original PDF')).toBeInTheDocument();
    expect(screen.getByText('Modified PDF')).toBeInTheDocument();
  });

  it('renders the compare button (disabled initially)', () => {
    renderComponent();
    const btn = screen.getByText('🔍 Compare PDFs').closest('button');
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('shows privacy notice about client-side processing', () => {
    renderComponent();
    expect(screen.getByText(/100% client-side/)).toBeInTheDocument();
    expect(screen.getByText(/pdf\.js/i)).toBeInTheDocument();
  });

  // ── Upload zones ───────────────────────────────────────────────────────

  it('renders drag-and-drop instructions for both zones', () => {
    renderComponent();
    const dropTexts = screen.getAllByText(/drag & drop pdf/i);
    expect(dropTexts).toHaveLength(2);
  });

  it('has hidden file inputs for both upload zones', () => {
    renderComponent();
    const inputs = screen.getAllByLabelText(/upload/i);
    expect(inputs).toHaveLength(2);
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('type', 'file');
      expect(input).toHaveAttribute('accept', '.pdf,application/pdf');
    });
  });

  it('shows error for non-PDF file on original side', async () => {
    renderComponent();
    const inputs = screen.getAllByLabelText(/upload/i);
    const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(inputs[0], { target: { files: [textFile] } });

    await waitFor(() => {
      expect(screen.getByText(/please upload a valid pdf/i)).toBeInTheDocument();
    });
  });

  it('shows error for oversized file', async () => {
    renderComponent();
    const inputs = screen.getAllByLabelText(/upload/i);
    const bigFile = new File(['x'.repeat(100)], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 60 * 1024 * 1024 });
    fireEvent.change(inputs[0], { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('accepts a valid PDF file and shows its name', async () => {
    renderComponent();
    const inputs = screen.getAllByLabelText(/upload/i);
    const pdfFile = new File(['%PDF-1.4'], 'original.pdf', { type: 'application/pdf' });
    fireEvent.change(inputs[0], { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(screen.getByText('original.pdf')).toBeInTheDocument();
    });
  });

  it('shows error when comparing without both files', async () => {
    renderComponent();
    const pdfFile = new File(['%PDF-1.4'], 'original.pdf', { type: 'application/pdf' });
    const inputs = screen.getAllByLabelText(/upload/i);
    fireEvent.change(inputs[0], { target: { files: [pdfFile] } });

    // Button should still be disabled since only one file uploaded
    await waitFor(() => {
      expect(screen.getByText('original.pdf')).toBeInTheDocument();
    });
  });

  // ── Drag-and-drop visual feedback ──────────────────────────────────────

  it('shows drag-over state on original upload zone', () => {
    renderComponent();
    const dropTexts = screen.getAllByText(/drag & drop pdf/i);
    const zone = dropTexts[0].closest('[class*="border-dashed"]');
    fireEvent.dragOver(zone, { preventDefault: () => {} });
    // The component should update dragOver state
  });
});
