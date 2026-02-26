import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => {
  const cache = new Map();
  return {
    motion: new Proxy({}, {
      get: (_, tag) => {
        if (!cache.has(tag)) {
          const Component = ({ children, initial, animate, exit, transition, whileHover, whileTap, layout, layoutId, variants, ...rest }) => {
            const Tag = typeof tag === 'string' ? tag : 'div';
            return <Tag {...rest}>{children}</Tag>;
          };
          Component.displayName = `motion.${String(tag)}`;
          cache.set(tag, Component);
        }
        return cache.get(tag);
      },
    }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

import FileUpload from './FileUpload.jsx';

function createFile(name, size, type) {
  const file = new File(['x'.repeat(Math.min(size, 64))], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('FileUpload', () => {
  it('renders an accessible upload zone', () => {
    render(<FileUpload onFilesSelected={vi.fn()} />);
    const zone = screen.getByRole('button', { name: /upload files/i });
    expect(zone).toBeInTheDocument();
    expect(zone).toHaveAttribute('tabindex', '0');
  });

  it('opens file picker on click', async () => {
    const onFiles = vi.fn();
    render(<FileUpload onFilesSelected={onFiles} />);
    const zone = screen.getByRole('button', { name: /upload files/i });
    // Clicking the zone should trigger the hidden input
    await userEvent.click(zone);
    // The hidden input should exist
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  });

  it('opens file picker on Enter key', () => {
    render(<FileUpload onFilesSelected={vi.fn()} />);
    const zone = screen.getByRole('button', { name: /upload files/i });
    const input = document.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(input, 'click');
    fireEvent.keyDown(zone, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('opens file picker on Space key', () => {
    render(<FileUpload onFilesSelected={vi.fn()} />);
    const zone = screen.getByRole('button', { name: /upload files/i });
    const input = document.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(input, 'click');
    fireEvent.keyDown(zone, { key: ' ' });
    expect(clickSpy).toHaveBeenCalled();
  });

  it('calls onFilesSelected with valid files on drop', () => {
    const onFiles = vi.fn();
    render(<FileUpload onFilesSelected={onFiles} maxSize={10 * 1024 * 1024} />);
    const zone = screen.getByRole('button', { name: /upload files/i });

    const file = createFile('test.png', 1024, 'image/png');
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('shows error when file exceeds maxSize', () => {
    const onFiles = vi.fn();
    render(<FileUpload onFilesSelected={onFiles} maxSize={1024} />);
    const zone = screen.getByRole('button', { name: /upload files/i });

    const file = createFile('big.png', 2048, 'image/png');
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/exceeds/i);
  });

  it('shows error when file type is not accepted', () => {
    const onFiles = vi.fn();
    render(<FileUpload onFilesSelected={onFiles} accept="image/*" />);
    const zone = screen.getByRole('button', { name: /upload files/i });

    const file = createFile('doc.pdf', 1024, 'application/pdf');
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/not an accepted file type/i);
  });

  it('accepts files matching extension-based accept', () => {
    const onFiles = vi.fn();
    render(<FileUpload onFilesSelected={onFiles} accept=".pdf,.txt" />);
    const zone = screen.getByRole('button', { name: /upload files/i });

    const file = createFile('doc.pdf', 1024, 'application/pdf');
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('clears error on successful upload after a failed one', async () => {
    const onFiles = vi.fn();
    render(<FileUpload onFilesSelected={onFiles} maxSize={1024} />);
    const zone = screen.getByRole('button', { name: /upload files/i });

    // First: too large
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [createFile('big.png', 2048, 'image/png')] } });
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Second: valid — error should clear
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [createFile('small.png', 512, 'image/png')] } });
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('applies drag-over visual state', async () => {
    render(<FileUpload onFilesSelected={vi.fn()} />);
    const zone = screen.getByRole('button', { name: /upload files/i });

    await act(async () => {
      fireEvent.dragOver(zone, { dataTransfer: { files: [] } });
    });
    expect(zone.className).toContain('border-primary-500/60');

    await act(async () => {
      fireEvent.dragLeave(zone, { dataTransfer: { files: [] } });
    });
    expect(zone.className).not.toContain('border-primary-500/60');
  });
});
