import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MemeGenerator from './MemeGenerator.jsx';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => {
      const Component = ({ children, initial, animate, exit, transition, whileHover, whileTap, mode, ...domProps }) => {
        const Tag = tag;
        return <Tag {...domProps}>{children}</Tag>;
      };
      Component.displayName = `motion.${String(tag)}`;
      return Component;
    },
  }),
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const MOCK_MEMES_RESPONSE = {
  success: true,
  data: {
    memes: Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      name: `Meme Template ${i + 1}`,
      url: `https://imgflip.com/meme${i + 1}.jpg`,
      width: 600,
      height: 400,
    })),
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve(MOCK_MEMES_RESPONSE) })
  );
  // Mock canvas getContext
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  }));
});

describe('MemeGenerator', () => {
  it('renders loading skeletons while fetching templates', () => {
    // Make fetch hang
    global.fetch = vi.fn(() => new Promise(() => {}));
    render(<MemeGenerator />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders template grid after fetching', async () => {
    render(<MemeGenerator />);
    await waitFor(() => {
      expect(screen.getByText('Meme Template 1')).toBeInTheDocument();
    });
  });

  it('shows only top 20 templates in Popular tab by default', async () => {
    render(<MemeGenerator />);
    await waitFor(() => {
      expect(screen.getByText('Meme Template 20')).toBeInTheDocument();
    });
    expect(screen.queryByText('Meme Template 21')).not.toBeInTheDocument();
  });

  it('shows all templates when All Templates tab is clicked', async () => {
    render(<MemeGenerator />);
    await waitFor(() => {
      expect(screen.getByText('Meme Template 1')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('All Templates'));
    expect(screen.getByText('Meme Template 25')).toBeInTheDocument();
  });

  it('filters templates by search input', async () => {
    render(<MemeGenerator />);
    await waitFor(() => {
      expect(screen.getByText('Meme Template 1')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'Template 20' } });
    await waitFor(() => {
      expect(screen.getByText('Meme Template 20')).toBeInTheDocument();
      expect(screen.queryByText('Meme Template 1')).not.toBeInTheDocument();
    });
  });

  it('shows upload zone when Upload tab is clicked', async () => {
    render(<MemeGenerator />);
    await waitFor(() => {
      expect(screen.getByText('Meme Template 1')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Upload'));
    expect(screen.getByText(/drop an image here/i)).toBeInTheDocument();
  });

  it('shows fallback when fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
    render(<MemeGenerator />);
    await waitFor(() => {
      expect(screen.getByText(/couldn't load templates/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/upload your own image/i)).toBeInTheDocument();
  });

  it('renders default text boxes for top and bottom text', () => {
    render(<MemeGenerator />);
    const inputs = screen.getAllByPlaceholderText('Enter text...');
    expect(inputs.length).toBe(2);
    expect(inputs[0]).toHaveValue('TOP TEXT');
    expect(inputs[1]).toHaveValue('BOTTOM TEXT');
  });

  it('adds a new text box when Add Text is clicked', async () => {
    render(<MemeGenerator />);
    const addBtn = screen.getByText('+ Add Text');
    fireEvent.click(addBtn);
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Enter text...');
      expect(inputs.length).toBe(3);
    });
  });

  it('removes a text box when remove button is clicked', async () => {
    render(<MemeGenerator />);
    const removeButtons = screen.getAllByLabelText('Remove text box');
    fireEvent.click(removeButtons[0]);
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Enter text...');
      expect(inputs.length).toBe(1);
    });
  });

  it('renders all three download/export buttons', () => {
    render(<MemeGenerator />);
    expect(screen.getByText(/download png/i)).toBeInTheDocument();
    expect(screen.getByText(/download jpg/i)).toBeInTheDocument();
    expect(screen.getByText(/copy to clipboard/i)).toBeInTheDocument();
  });

  it('renders font family selector with all options', () => {
    render(<MemeGenerator />);
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Arial')).toBeInTheDocument();
    expect(screen.getByText('Comic Sans')).toBeInTheDocument();
    expect(screen.getByText('Times New Roman')).toBeInTheDocument();
  });

  it('renders position presets for each text box', () => {
    render(<MemeGenerator />);
    const topButtons = screen.getAllByText('Top');
    const centerButtons = screen.getAllByText('Center');
    const bottomButtons = screen.getAllByText('Bottom');
    expect(topButtons.length).toBe(2);
    expect(centerButtons.length).toBe(2);
    expect(bottomButtons.length).toBe(2);
  });
});
