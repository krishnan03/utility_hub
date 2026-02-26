import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar, { categories } from './Sidebar';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }) => {
        const { layoutId, transition, ...rest } = props;
        return <div {...rest}>{children}</div>;
      },
    },
  };
});

function renderSidebar(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  it('renders all category links', () => {
    renderSidebar();
    categories.forEach((cat) => {
      expect(screen.getByText(cat.name)).toBeInTheDocument();
    });
  });

  it('has correct aria-label on aside element', () => {
    renderSidebar();
    expect(screen.getByLabelText('Tool categories')).toBeInTheDocument();
  });

  it('has navigation role with aria-label', () => {
    renderSidebar();
    expect(screen.getByLabelText('Category navigation')).toBeInTheDocument();
  });

  it('renders NavLinks with correct paths', () => {
    renderSidebar();
    categories.forEach((cat) => {
      const link = screen.getByText(cat.name).closest('a');
      expect(link).toHaveAttribute('href', cat.path);
    });
  });

  it('highlights active category', () => {
    renderSidebar('/category/image');
    const imageLink = screen.getByText('Images').closest('a');
    expect(imageLink.className).toContain('text-primary');
  });

  it('exports categories array with all categories', () => {
    expect(categories).toHaveLength(13);
    const ids = categories.map((c) => c.id);
    expect(ids).toContain('image');
    expect(ids).toContain('document');
    expect(ids).toContain('text');
    expect(ids).toContain('developer');
    expect(ids).toContain('media');
    expect(ids).toContain('finance');
    expect(ids).toContain('ai');
    expect(ids).toContain('student');
    expect(ids).toContain('design');
    expect(ids).toContain('security');
    expect(ids).toContain('seo');
    expect(ids).toContain('utility');
    expect(ids).toContain('spreadsheet');
  });

  it('is hidden on mobile (has hidden lg:flex classes)', () => {
    renderSidebar();
    const aside = screen.getByLabelText('Tool categories');
    expect(aside.className).toContain('hidden');
    expect(aside.className).toContain('lg:flex');
  });
});
