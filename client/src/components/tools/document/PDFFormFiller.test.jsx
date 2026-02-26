import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PDFFormFiller from './PDFFormFiller.jsx';

// ─── Mock pdf-lib (dynamic import) ──────────────────────────────────────────

const mockTextField = {
  getName: () => 'fullName',
  getText: () => '',
  isMultiline: () => false,
  setText: vi.fn(),
  constructor: { name: 'PDFTextField' },
};

const mockCheckBox = {
  getName: () => 'agree',
  isChecked: () => false,
  check: vi.fn(),
  uncheck: vi.fn(),
  constructor: { name: 'PDFCheckBox' },
};

const mockDropdown = {
  getName: () => 'country',
  getSelected: () => [],
  getOptions: () => ['USA', 'Canada', 'UK'],
  select: vi.fn(),
  constructor: { name: 'PDFDropdown' },
};

const mockRadioGroup = {
  getName: () => 'gender',
  getSelected: () => null,
  getOptions: () => ['Male', 'Female', 'Other'],
  select: vi.fn(),
  constructor: { name: 'PDFRadioGroup' },
};

let mockFields = [mockTextField, mockCheckBox, mockDropdown, mockRadioGroup];

const mockForm = {
  getFields: () => mockFields,
  getField: (name) => {
    const map = { fullName: mockTextField, agree: mockCheckBox, country: mockDropdown, gender: mockRadioGroup };
    return map[name];
  },
  flatten: vi.fn(),
};

const mockPdfDoc = {
  getForm: () => mockForm,
  save: vi.fn(() => new Uint8Array([37, 80, 68, 70])),
};

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn(() => Promise.resolve(mockPdfDoc)),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderComponent() {
  return render(
    <MemoryRouter>
      <PDFFormFiller />
    </MemoryRouter>,
  );
}

function createMockPDFFile() {
  const bytes = new Uint8Array([37, 80, 68, 70]); // %PDF
  return new File([bytes], 'test-form.pdf', { type: 'application/pdf' });
}

async function uploadPDF() {
  const file = createMockPDFFile();
  const input = document.querySelector('input[type="file"]');
  await userEvent.upload(input, file);
  // Wait for async processing to complete
  await waitFor(() => {
    expect(screen.getByText(/fields detected/i)).toBeInTheDocument();
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PDFFormFiller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFields = [mockTextField, mockCheckBox, mockDropdown, mockRadioGroup];
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders the upload zone initially', () => {
    renderComponent();
    expect(screen.getByText(/drag & drop a pdf with form fields/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  it('shows privacy notice', () => {
    renderComponent();
    expect(screen.getByText(/your pdf never leaves your browser/i)).toBeInTheDocument();
  });

  it('has a hidden file input accepting PDFs', () => {
    renderComponent();
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', '.pdf,application/pdf');
  });

  it('detects form fields after uploading a PDF', async () => {
    renderComponent();
    await uploadPDF();

    expect(screen.getByText(/4 fields detected/i)).toBeInTheDocument();
    expect(screen.getByText('fullName')).toBeInTheDocument();
    expect(screen.getByText('agree')).toBeInTheDocument();
    expect(screen.getByText('country')).toBeInTheDocument();
    expect(screen.getByText('gender')).toBeInTheDocument();
  });

  it('shows field type badges', async () => {
    renderComponent();
    await uploadPDF();

    expect(screen.getByText(/1 text/)).toBeInTheDocument();
    expect(screen.getByText(/1 checkbox/)).toBeInTheDocument();
    expect(screen.getByText(/1 dropdown/)).toBeInTheDocument();
    expect(screen.getByText(/1 radio/)).toBeInTheDocument();
  });

  it('renders appropriate input types for each field', async () => {
    renderComponent();
    await uploadPDF();

    // Text input
    expect(screen.getByPlaceholderText('Enter fullName')).toBeInTheDocument();
    // Checkbox
    expect(screen.getByText('Unchecked')).toBeInTheDocument();
    // Dropdown
    expect(screen.getByText('— Select —')).toBeInTheDocument();
    // Radio options
    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('shows the flatten toggle and download button', async () => {
    renderComponent();
    await uploadPDF();

    expect(screen.getByText(/flatten after filling/i)).toBeInTheDocument();
    expect(screen.getByText(/fill & download pdf/i)).toBeInTheDocument();
  });

  it('shows the reset button after upload', async () => {
    renderComponent();
    await uploadPDF();

    expect(screen.getByText(/upload a different pdf/i)).toBeInTheDocument();
  });

  it('resets to upload view when clicking reset', async () => {
    renderComponent();
    await uploadPDF();

    fireEvent.click(screen.getByText(/upload a different pdf/i));

    await waitFor(() => {
      expect(screen.getByText(/drag & drop a pdf with form fields/i)).toBeInTheDocument();
    });
  });

  it('shows error when PDF has no form fields', async () => {
    mockFields = [];
    renderComponent();

    const file = createMockPDFFile();
    const input = document.querySelector('input[type="file"]');
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/does not contain any interactive form fields/i)).toBeInTheDocument();
    });
  });

  it('triggers download when Fill & Download is clicked', async () => {
    renderComponent();
    await uploadPDF();

    const mockLink = { href: '', download: '', click: vi.fn(), style: {} };
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockLink;
      return origCreateElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    fireEvent.click(screen.getByText(/fill & download pdf/i));

    await waitFor(() => {
      expect(mockPdfDoc.save).toHaveBeenCalled();
    });

    document.createElement.mockRestore();
    document.body.appendChild.mockRestore();
    document.body.removeChild.mockRestore();
  });

  it('displays the file name after upload', async () => {
    renderComponent();
    await uploadPDF();

    expect(screen.getByText('test-form.pdf')).toBeInTheDocument();
  });
});
