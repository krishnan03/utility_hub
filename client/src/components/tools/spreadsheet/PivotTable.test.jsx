import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PivotTable from './PivotTable.jsx';

function renderComponent() {
  return render(
    <MemoryRouter>
      <PivotTable />
    </MemoryRouter>,
  );
}

const SAMPLE_CSV = `Name,Region,Sales
Alice,North,100
Bob,South,200
Alice,South,150
Bob,North,300
Charlie,North,250`;

describe('PivotTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });
  });

  // ── Initial render ─────────────────────────────────────────────────────

  it('renders upload zone and paste area', () => {
    renderComponent();
    expect(screen.getByText(/drag & drop csv/i)).toBeInTheDocument();
    expect(screen.getByText(/or paste data/i)).toBeInTheDocument();
  });

  it('renders the load pasted data button (disabled when empty)', () => {
    renderComponent();
    const btn = screen.getByText('📋 Load Pasted Data').closest('button');
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('shows the paste data textarea', () => {
    renderComponent();
    expect(screen.getByPlaceholderText(/name,region,sales/i)).toBeInTheDocument();
  });

  it('has a hidden file input for CSV upload', () => {
    renderComponent();
    const input = screen.getByLabelText(/upload csv/i);
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', '.csv,.tsv,.txt');
  });

  // ── Paste data ─────────────────────────────────────────────────────────

  it('loads pasted CSV data and shows configure panel', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/name,region,sales/i);
    await userEvent.type(textarea, SAMPLE_CSV);
    fireEvent.click(screen.getByText('📋 Load Pasted Data'));

    await waitFor(() => {
      expect(screen.getByText('Pasted data')).toBeInTheDocument();
      expect(screen.getByText(/3 columns/)).toBeInTheDocument();
      expect(screen.getByText(/5 rows/)).toBeInTheDocument();
      expect(screen.getByText('Configure Pivot Table')).toBeInTheDocument();
    });
  });

  it('shows all column dropdowns after loading data', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/name,region,sales/i);
    await userEvent.type(textarea, SAMPLE_CSV);
    fireEvent.click(screen.getByText('📋 Load Pasted Data'));

    await waitFor(() => {
      expect(screen.getByLabelText(/row field/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/column field/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/value field/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/aggregation/i)).toBeInTheDocument();
    });
  });

  it('shows all aggregation options', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/name,region,sales/i);
    await userEvent.type(textarea, SAMPLE_CSV);
    fireEvent.click(screen.getByText('📋 Load Pasted Data'));

    await waitFor(() => {
      const aggSelect = screen.getByLabelText(/aggregation/i);
      expect(aggSelect).toBeInTheDocument();
      const options = aggSelect.querySelectorAll('option');
      const values = Array.from(options).map((o) => o.value);
      expect(values).toEqual(['SUM', 'COUNT', 'AVG', 'MIN', 'MAX']);
    });
  });

  // ── Generate pivot table ───────────────────────────────────────────────

  it('generates a pivot table with SUM aggregation', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/name,region,sales/i);
    await userEvent.type(textarea, SAMPLE_CSV);
    fireEvent.click(screen.getByText('📋 Load Pasted Data'));

    await waitFor(() => {
      expect(screen.getByText('📊 Generate Pivot Table')).toBeInTheDocument();
    });

    // Set value field to Sales (3rd column)
    const valSelect = screen.getByLabelText(/value field/i);
    fireEvent.change(valSelect, { target: { value: 'Sales' } });

    fireEvent.click(screen.getByText('📊 Generate Pivot Table'));

    await waitFor(() => {
      expect(screen.getByText(/pivot table generated/i)).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  it('generates a cross-tabulation pivot with column field', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/name,region,sales/i);
    await userEvent.type(textarea, SAMPLE_CSV);
    fireEvent.click(screen.getByText('📋 Load Pasted Data'));

    await waitFor(() => {
      expect(screen.getByText('📊 Generate Pivot Table')).toBeInTheDocument();
    });

    // Set column field to Region
    const colSelect = screen.getByLabelText(/column field/i);
    fireEvent.change(colSelect, { target: { value: 'Region' } });

    const valSelect = screen.getByLabelText(/value field/i);
    fireEvent.change(valSelect, { target: { value: 'Sales' } });

    fireEvent.click(screen.getByText('📊 Generate Pivot Table'));

    await waitFor(() => {
      expect(screen.getByText('North')).toBeInTheDocument();
      expect(screen.getByText('South')).toBeInTheDocument();
    });
  });

  // ── Export ─────────────────────────────────────────────────────────────

  it('shows export buttons after generating pivot', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/name,region,sales/i);
    await userEvent.type(textarea, SAMPLE_CSV);
    fireEvent.click(screen.getByText('📋 Load Pasted Data'));

    await waitFor(() => {
      const valSelect = screen.getByLabelText(/value field/i);
      fireEvent.change(valSelect, { target: { value: 'Sales' } });
      fireEvent.click(screen.getByText('📊 Generate Pivot Table'));
    });

    await waitFor(() => {
      expect(screen.getByText('📥 Export CSV')).toBeInTheDocument();
      expect(screen.getByText('📋 Copy TSV')).toBeInTheDocument();
    });
  });

  it('copies TSV to clipboard', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/name,region,sales/i);
    await userEvent.type(textarea, SAMPLE_CSV);
    fireEvent.click(screen.getByText('📋 Load Pasted Data'));

    await waitFor(() => {
      const valSelect = screen.getByLabelText(/value field/i);
      fireEvent.change(valSelect, { target: { value: 'Sales' } });
      fireEvent.click(screen.getByText('📊 Generate Pivot Table'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('📋 Copy TSV'));
    });

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  // ── Reset ──────────────────────────────────────────────────────────────

  it('resets to initial state when load different data is clicked', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/name,region,sales/i);
    await userEvent.type(textarea, SAMPLE_CSV);
    fireEvent.click(screen.getByText('📋 Load Pasted Data'));

    await waitFor(() => {
      expect(screen.getByText('Configure Pivot Table')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('← Load different data'));

    await waitFor(() => {
      expect(screen.getByText(/drag & drop csv/i)).toBeInTheDocument();
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────

  it('shows error for invalid file type', async () => {
    renderComponent();
    const input = screen.getByLabelText(/upload csv/i);
    const badFile = new File(['hello'], 'test.exe', { type: 'application/octet-stream' });
    fireEvent.change(input, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByText(/please upload a csv/i)).toBeInTheDocument();
    });
  });

  it('shows error for empty CSV', async () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/name,region,sales/i);
    await userEvent.type(textarea, 'Name');
    fireEvent.click(screen.getByText('📋 Load Pasted Data'));

    await waitFor(() => {
      expect(screen.getByText(/at least a header row/i)).toBeInTheDocument();
    });
  });
});
