import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BatchUpload from './BatchUpload.jsx';

const sampleFiles = [
  { name: 'photo.png', size: 2048000, progress: 50, status: 'uploading' },
  { name: 'doc.pdf', size: 512000, progress: 100, status: 'complete' },
  { name: 'video.mp4', size: 10240000, progress: 0, status: 'pending' },
  { name: 'broken.txt', size: 100, progress: 30, status: 'error' },
];

describe('BatchUpload', () => {
  it('renders nothing when files array is empty', () => {
    const { container } = render(<BatchUpload files={[]} onRemove={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all files with names and sizes', () => {
    render(<BatchUpload files={sampleFiles} onRemove={vi.fn()} />);
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('video.mp4')).toBeInTheDocument();
    expect(screen.getByText('broken.txt')).toBeInTheDocument();
  });

  it('displays formatted file sizes', () => {
    render(<BatchUpload files={sampleFiles} onRemove={vi.fn()} />);
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    expect(screen.getByText('500.0 KB')).toBeInTheDocument();
    expect(screen.getByText('9.8 MB')).toBeInTheDocument();
    expect(screen.getByText('100 B')).toBeInTheDocument();
  });

  it('shows status labels for each file', () => {
    render(<BatchUpload files={sampleFiles} onRemove={vi.fn()} />);
    expect(screen.getByText(/Uploading — 50%/)).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('calls onRemove with correct index when remove button clicked', () => {
    const onRemove = vi.fn();
    render(<BatchUpload files={sampleFiles} onRemove={onRemove} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[1]); // Remove doc.pdf
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('has aria-live region for status updates', () => {
    render(<BatchUpload files={sampleFiles} onRemove={vi.fn()} />);
    const region = screen.getByLabelText(/file upload list/i);
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('remove buttons have accessible labels with filenames', () => {
    render(<BatchUpload files={sampleFiles} onRemove={vi.fn()} />);
    expect(screen.getByRole('button', { name: /remove photo\.png/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove doc\.pdf/i })).toBeInTheDocument();
  });
});
