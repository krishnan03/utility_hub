import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreviewPanel from './PreviewPanel.jsx';

describe('PreviewPanel', () => {
  const before = { url: '/img/original.png', label: 'Original', size: 2048000 };
  const after = { url: '/img/compressed.png', label: 'Compressed', size: 512000 };

  it('renders nothing when both before and after are null', () => {
    const { container } = render(<PreviewPanel before={null} after={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders before and after images with labels', () => {
    render(<PreviewPanel before={before} after={after} />);
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Compressed')).toBeInTheDocument();
    expect(screen.getByAltText('Original')).toBeInTheDocument();
    expect(screen.getByAltText('Compressed')).toBeInTheDocument();
  });

  it('displays file sizes', () => {
    render(<PreviewPanel before={before} after={after} />);
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    expect(screen.getByText('500.0 KB')).toBeInTheDocument();
  });

  it('shows percentage savings when both sizes provided', () => {
    render(<PreviewPanel before={before} after={after} />);
    expect(screen.getByText(/75\.0% smaller/)).toBeInTheDocument();
  });

  it('shows percentage larger when output is bigger', () => {
    const bigAfter = { url: '/img/big.png', label: 'Bigger', size: 4096000 };
    render(<PreviewPanel before={before} after={bigAfter} />);
    expect(screen.getByText(/100(\.0)?% larger/)).toBeInTheDocument();
  });

  it('renders only before panel when after is null', () => {
    render(<PreviewPanel before={before} after={null} />);
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.queryByText('Compressed')).not.toBeInTheDocument();
  });

  it('renders only after panel when before is null', () => {
    render(<PreviewPanel before={null} after={after} />);
    expect(screen.getByText('Compressed')).toBeInTheDocument();
    expect(screen.queryByText('Original')).not.toBeInTheDocument();
  });

  it('uses default labels when not provided', () => {
    const b = { url: '/a.png', size: 1000 };
    const a = { url: '/b.png', size: 500 };
    render(<PreviewPanel before={b} after={a} />);
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Processed')).toBeInTheDocument();
  });

  it('images have appropriate alt text', () => {
    render(<PreviewPanel before={before} after={after} />);
    const origImg = screen.getByAltText('Original');
    const compImg = screen.getByAltText('Compressed');
    expect(origImg).toHaveAttribute('src', '/img/original.png');
    expect(compImg).toHaveAttribute('src', '/img/compressed.png');
  });

  it('does not show savings when sizes are missing', () => {
    const noSize = { url: '/a.png', label: 'A' };
    render(<PreviewPanel before={noSize} after={noSize} />);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
