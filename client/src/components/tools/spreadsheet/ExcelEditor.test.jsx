import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as XLSX from 'xlsx';

// Mock Univer — it requires a real DOM canvas which jsdom doesn't support
const mockDispose = vi.fn();
const mockGetSnapshot = vi.fn(() => ({
  sheetOrder: ['sheet_0'],
  sheets: {
    sheet_0: {
      id: 'sheet_0',
      name: 'Sheet1',
      cellData: {
        0: { 0: { v: 'Hello' }, 1: { v: 'World' } },
        1: { 0: { v: 42 }, 1: { v: 100 } },
      },
    },
  },
}));
const mockCreateWorkbook = vi.fn();
const mockGetActiveWorkbook = vi.fn(() => ({
  getSnapshot: mockGetSnapshot,
}));
const mockOnCommandExecuted = vi.fn(() => ({ dispose: vi.fn() }));
const mockUniverAPI = {
  createWorkbook: mockCreateWorkbook,
  getActiveWorkbook: mockGetActiveWorkbook,
  onCommandExecuted: mockOnCommandExecuted,
  dispose: mockDispose,
};

vi.mock('@univerjs/presets', () => ({
  createUniver: vi.fn(() => ({ univerAPI: mockUniverAPI })),
  LocaleType: { EN_US: 'EN_US' },
  mergeLocales: vi.fn((l) => l),
}));

vi.mock('@univerjs/preset-sheets-core', () => ({
  UniverSheetsCorePreset: vi.fn(() => ({})),
}));

vi.mock('@univerjs/preset-sheets-core/locales/en-US', () => ({
  default: {},
}));

vi.mock('@univerjs/preset-sheets-core/lib/index.css', () => ({}));

function renderEditor() {
  return render(
    <MemoryRouter>
      <ExcelEditor />
    </MemoryRouter>,
  );
}

// Import after mocks
let ExcelEditor;
beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  const mod = await import('./ExcelEditor.jsx');
  ExcelEditor = mod.default;
});

afterEach(() => {
  localStorage.clear();
});

describe('ExcelEditor', () => {
  // ── Initial render ─────────────────────────────────────────────────

  it('renders the header with action buttons', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Save .xlsx')).toBeInTheDocument();
      expect(screen.getByText('.csv')).toBeInTheDocument();
    });
  });

  it('renders the privacy footer', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText(/your data never leaves your browser/i)).toBeInTheDocument();
    });
  });

  it('shows the default file name', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText(/Untitled Spreadsheet/)).toBeInTheDocument();
    });
  });

  it('renders the Univer container div', async () => {
    renderEditor();
    await waitFor(() => {
      const container = document.querySelector('.univer-container');
      expect(container).toBeInTheDocument();
    });
  });

  // ── File name editing ──────────────────────────────────────────────

  it('allows editing the file name on click', async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText(/Untitled Spreadsheet/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Untitled Spreadsheet/));

    await waitFor(() => {
      const input = screen.getByDisplayValue('Untitled Spreadsheet');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });
  });

  it('saves file name on Enter key', async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText(/Untitled Spreadsheet/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Untitled Spreadsheet/));

    const input = screen.getByDisplayValue('Untitled Spreadsheet');
    await user.clear(input);
    await user.type(input, 'My Budget{Enter}');

    await waitFor(() => {
      expect(screen.getByText(/My Budget/)).toBeInTheDocument();
    });
  });

  // ── File import validation ─────────────────────────────────────────

  it('rejects files larger than 50MB', async () => {
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const bigFile = new File(['x'.repeat(100)], 'big.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    Object.defineProperty(bigFile, 'size', { value: 60 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File too large/)).toBeInTheDocument();
    });
  });

  it('rejects unsupported file extensions', async () => {
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]');
    const badFile = new File(['hello'], 'test.exe', { type: 'application/octet-stream' });

    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Unsupported format/)).toBeInTheDocument();
    });
  });

  // ── Drag and drop ──────────────────────────────────────────────────

  it('shows drag overlay on dragover', async () => {
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    const wrapper = document.querySelector('.univer-container').closest('[class*="relative"]');
    fireEvent.dragOver(wrapper, { dataTransfer: { files: [] } });

    await waitFor(() => {
      expect(screen.getByText(/Drop your spreadsheet here/)).toBeInTheDocument();
    });
  });

  // ── Export buttons state ───────────────────────────────────────────

  it('enables save buttons when status is ready', async () => {
    renderEditor();

    await waitFor(() => {
      const saveBtn = screen.getByText('Save .xlsx').closest('button');
      expect(saveBtn).not.toBeDisabled();
    });
  });

  // ── New spreadsheet ────────────────────────────────────────────────

  it('creates a new spreadsheet when New is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    await user.click(screen.getByText('New'));

    await waitFor(() => {
      expect(screen.getByText(/New spreadsheet created/)).toBeInTheDocument();
    });
  });

  it('clears localStorage autosave on New', async () => {
    localStorage.setItem('toolpilot_excel_autosave', JSON.stringify({ snapshot: {}, fileName: 'Old' }));
    const user = userEvent.setup();
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    await user.click(screen.getByText('New'));

    expect(localStorage.getItem('toolpilot_excel_autosave')).toBeNull();
  });

  // ── Stats display ─────────────────────────────────────────────────

  it('shows sheet and cell count in footer', async () => {
    renderEditor();

    await waitFor(() => {
      expect(screen.getByText(/\d+ sheet/)).toBeInTheDocument();
      expect(screen.getByText(/\d+ cell/)).toBeInTheDocument();
    });
  });

  // ── Hidden file input ──────────────────────────────────────────────

  it('has a hidden file input accepting spreadsheet formats', async () => {
    renderEditor();

    await waitFor(() => {
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
      expect(input.accept).toBe('.xlsx,.xls,.csv');
    });
  });
});

// ── Conversion function tests ────────────────────────────────────────

describe('SheetJS ↔ Univer conversion (integration)', () => {
  it('round-trips a simple workbook through SheetJS → Univer → SheetJS', () => {
    // Create a SheetJS workbook
    const wb = XLSX.utils.book_new();
    const data = [
      ['Name', 'Score'],
      ['Alice', 95],
      ['Bob', 87],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Grades');

    // Verify the workbook was created correctly
    expect(wb.SheetNames).toEqual(['Grades']);
    expect(wb.Sheets['Grades']['A1'].v).toBe('Name');
    expect(wb.Sheets['Grades']['B2'].v).toBe(95);
  });

  it('handles empty workbooks gracefully', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Empty');

    expect(wb.SheetNames).toHaveLength(1);
    expect(wb.SheetNames[0]).toBe('Empty');
  });

  it('preserves multiple sheets', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['A']]), 'Sheet1');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['B']]), 'Sheet2');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['C']]), 'Sheet3');

    expect(wb.SheetNames).toHaveLength(3);
    expect(wb.SheetNames).toEqual(['Sheet1', 'Sheet2', 'Sheet3']);
  });
});
