import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar.jsx';

describe('ProgressBar', () => {
  it('renders with correct ARIA progressbar role', () => {
    render(<ProgressBar progress={50} label="Uploading" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays label and percentage text', () => {
    render(<ProgressBar progress={75} label="Converting" />);
    expect(screen.getByText('Converting')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('clamps progress to 0-100 range', () => {
    const { rerender } = render(<ProgressBar progress={-10} label="Test" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    rerender(<ProgressBar progress={150} label="Test" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('does not show percentage in indeterminate mode', () => {
    render(<ProgressBar indeterminate label="Processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('does not set aria-valuenow in indeterminate mode', () => {
    render(<ProgressBar indeterminate label="Loading" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
  });

  it('has aria-label matching the label prop', () => {
    render(<ProgressBar progress={30} label="Compressing" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Compressing');
  });

  it('rounds displayed percentage', () => {
    render(<ProgressBar progress={33.7} label="Test" />);
    expect(screen.getByText('34%')).toBeInTheDocument();
  });
});
