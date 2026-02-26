import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorMessage from './ErrorMessage.jsx';

describe('ErrorMessage', () => {
  it('renders nothing when message is falsy', () => {
    const { container } = render(<ErrorMessage message="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message with alert role', () => {
    render(<ErrorMessage message="Something went wrong" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorMessage message="Failed" onRetry={onRetry} />);
    const btn = screen.getByRole('button', { name: /retry/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<ErrorMessage message="Failed" onDismiss={onDismiss} />);
    const btn = screen.getByRole('button', { name: /dismiss/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('shows both retry and dismiss buttons when both provided', () => {
    render(<ErrorMessage message="Error" onRetry={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('does not show action buttons when no callbacks provided', () => {
    render(<ErrorMessage message="Error occurred" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('retry and dismiss buttons meet 44px minimum touch target', () => {
    render(<ErrorMessage message="Error" onRetry={vi.fn()} onDismiss={vi.fn()} />);
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    // Check that min-w and min-h classes are applied
    expect(retryBtn.className).toContain('min-w-[44px]');
    expect(retryBtn.className).toContain('min-h-[44px]');
    expect(dismissBtn.className).toContain('min-w-[44px]');
    expect(dismissBtn.className).toContain('min-h-[44px]');
  });
});
