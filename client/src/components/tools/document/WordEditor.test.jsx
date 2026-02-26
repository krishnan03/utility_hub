import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ── Mock TipTap ──────────────────────────────────────────────────────
// TipTap requires a real DOM with contenteditable which jsdom doesn't fully support.
// We mock useEditor to return a controllable editor-like object.

let mockEditorState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  codeBlock: false,
  table: false,
  heading: null,
  textAlign: 'left',
  textColor: null,
  highlightColor: null,
  html: '<p>Hello World</p>',
  json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] }] },
  canUndo: true,
  canRedo: false,
};

const mockChainMethods = {};
const chainProxy = new Proxy({}, {
  get: (_, prop) => {
    if (prop === 'run') return vi.fn(() => true);
    if (prop === 'focus') return vi.fn(() => chainProxy);
    return vi.fn(() => chainProxy);
  },
});

const mockEditor = {
  isActive: vi.fn((type, attrs) => {
    if (type === 'bold') return mockEditorState.bold;
    if (type === 'italic') return mockEditorState.italic;
    if (type === 'underline') return mockEditorState.underline;
    if (type === 'strike') return mockEditorState.strike;
    if (type === 'bulletList') return mockEditorState.bulletList;
    if (type === 'orderedList') return mockEditorState.orderedList;
    if (type === 'blockquote') return mockEditorState.blockquote;
    if (type === 'codeBlock') return mockEditorState.codeBlock;
    if (type === 'table') return mockEditorState.table;
    if (type === 'heading' && attrs?.level) return mockEditorState.heading === attrs.level;
    if (typeof type === 'object' && type.textAlign) return mockEditorState.textAlign === type.textAlign;
    return false;
  }),
  chain: vi.fn(() => chainProxy),
  can: vi.fn(() => ({
    undo: () => mockEditorState.canUndo,
    redo: () => mockEditorState.canRedo,
  })),
  commands: {
    setContent: vi.fn(),
    clearContent: vi.fn(),
  },
  getHTML: vi.fn(() => mockEditorState.html),
  getJSON: vi.fn(() => mockEditorState.json),
  getAttributes: vi.fn((type) => {
    if (type === 'textStyle') return { color: mockEditorState.textColor };
    if (type === 'highlight') return { color: mockEditorState.highlightColor };
    return {};
  }),
  state: {
    doc: {
      textContent: 'Hello World',
      content: { size: 13 },
    },
  },
};

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => mockEditor),
  EditorContent: vi.fn(({ editor }) => (
    <div data-testid="editor-content" className="tiptap">
      <p>{editor?.state?.doc?.textContent || ''}</p>
    </div>
  )),
}));

vi.mock('@tiptap/starter-kit', () => ({ default: { configure: vi.fn(() => ({})) } }));
vi.mock('@tiptap/extension-underline', () => ({ Underline: {} }));
vi.mock('@tiptap/extension-text-align', () => ({ TextAlign: { configure: vi.fn(() => ({})) } }));
vi.mock('@tiptap/extension-text-style', () => ({ TextStyle: {} }));
vi.mock('@tiptap/extension-color', () => ({ Color: {} }));
vi.mock('@tiptap/extension-highlight', () => ({ Highlight: { configure: vi.fn(() => ({})) } }));
vi.mock('@tiptap/extension-image', () => ({ Image: { configure: vi.fn(() => ({})) } }));
vi.mock('@tiptap/extension-table', () => ({ Table: { configure: vi.fn(() => ({})) } }));
vi.mock('@tiptap/extension-table-row', () => ({ TableRow: {} }));
vi.mock('@tiptap/extension-table-cell', () => ({ TableCell: {} }));
vi.mock('@tiptap/extension-table-header', () => ({ TableHeader: {} }));
vi.mock('@tiptap/extension-placeholder', () => ({ Placeholder: { configure: vi.fn(() => ({})) } }));

vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn(() => Promise.resolve({ value: '<p>Imported content</p>' })),
    images: { imgElement: vi.fn((fn) => fn) },
  },
}));

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

function renderEditor() {
  return render(
    <MemoryRouter>
      <WordEditor />
    </MemoryRouter>,
  );
}

let WordEditor;
beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  const mod = await import('./WordEditor.jsx');
  WordEditor = mod.default;
});

afterEach(() => {
  localStorage.clear();
});

describe('WordEditor', () => {
  // ── Initial Render ─────────────────────────────────────────────────

  it('renders the document title input', async () => {
    renderEditor();
    await waitFor(() => {
      const input = screen.getByDisplayValue('Untitled Document');
      expect(input).toBeInTheDocument();
    });
  });

  it('renders the editor content area', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  it('renders the privacy footer', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText(/your data never leaves your browser/i)).toBeInTheDocument();
    });
  });

  it('shows word and character counts in footer', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText(/2 words/)).toBeInTheDocument();
      expect(screen.getByText(/11 characters/)).toBeInTheDocument();
    });
  });

  it('shows page estimate in footer', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText(/~1 page/)).toBeInTheDocument();
    });
  });

  // ── Title Editing ──────────────────────────────────────────────────

  it('allows editing the document title', async () => {
    const user = userEvent.setup();
    renderEditor();

    const input = screen.getByDisplayValue('Untitled Document');
    await user.clear(input);
    await user.type(input, 'My Report');

    expect(screen.getByDisplayValue('My Report')).toBeInTheDocument();
  });

  // ── Toolbar Buttons ────────────────────────────────────────────────

  it('renders formatting toolbar buttons', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTitle(/Bold \(Ctrl\+B\)/)).toBeInTheDocument();
      expect(screen.getByTitle(/Italic \(Ctrl\+I\)/)).toBeInTheDocument();
      expect(screen.getByTitle(/Underline \(Ctrl\+U\)/)).toBeInTheDocument();
      expect(screen.getByTitle('Strikethrough')).toBeInTheDocument();
    });
  });

  it('renders heading buttons', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTitle('Heading 1')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
      expect(screen.getByTitle('Heading 3')).toBeInTheDocument();
    });
  });

  it('renders alignment buttons', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTitle('Align Left')).toBeInTheDocument();
      expect(screen.getByTitle('Align Center')).toBeInTheDocument();
      expect(screen.getByTitle('Align Right')).toBeInTheDocument();
      expect(screen.getByTitle('Justify')).toBeInTheDocument();
    });
  });

  it('renders list and insert buttons', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
      expect(screen.getByTitle('Ordered List')).toBeInTheDocument();
      expect(screen.getByTitle('Table')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Image')).toBeInTheDocument();
      expect(screen.getByTitle('Blockquote')).toBeInTheDocument();
      expect(screen.getByTitle('Horizontal Rule')).toBeInTheDocument();
      expect(screen.getByTitle('Code Block')).toBeInTheDocument();
    });
  });

  it('renders file action buttons', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTitle(/New Document/)).toBeInTheDocument();
      expect(screen.getByTitle(/Open .docx/)).toBeInTheDocument();
      expect(screen.getByTitle(/Save as .doc/)).toBeInTheDocument();
      expect(screen.getByTitle(/Save as PDF/)).toBeInTheDocument();
      expect(screen.getByTitle(/Save as HTML/)).toBeInTheDocument();
    });
  });

  it('renders undo/redo buttons', async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByTitle(/Undo/)).toBeInTheDocument();
      expect(screen.getByTitle(/Redo/)).toBeInTheDocument();
    });
  });

  // ── Toolbar Interactions ───────────────────────────────────────────

  it('calls toggleBold when bold button is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    const boldBtn = screen.getByTitle(/Bold/);
    await user.click(boldBtn);

    expect(mockEditor.chain).toHaveBeenCalled();
  });

  it('calls toggleItalic when italic button is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    const italicBtn = screen.getByTitle(/Italic/);
    await user.click(italicBtn);

    expect(mockEditor.chain).toHaveBeenCalled();
  });

  // ── File Import ────────────────────────────────────────────────────

  it('has a hidden file input accepting .docx files', async () => {
    renderEditor();
    await waitFor(() => {
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
      expect(input.accept).toBe('.docx,.doc');
    });
  });

  it('rejects non-docx files on import', async () => {
    renderEditor();

    const fileInput = document.querySelector('input[type="file"]');
    const badFile = new File(['hello'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Please upload a .docx file/)).toBeInTheDocument();
    });
  });

  it('imports a .docx file via mammoth', async () => {
    const mammoth = (await import('mammoth')).default;
    renderEditor();

    const fileInput = document.querySelector('input[type="file"]');
    const buffer = new ArrayBuffer(8);
    const docxFile = new File([buffer], 'report.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    // jsdom File.arrayBuffer() can be flaky — polyfill it
    docxFile.arrayBuffer = vi.fn(() => Promise.resolve(buffer));

    fireEvent.change(fileInput, { target: { files: [docxFile] } });

    await waitFor(() => {
      expect(mammoth.convertToHtml).toHaveBeenCalled();
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith('<p>Imported content</p>');
    });
  });

  it('updates document title on import', async () => {
    renderEditor();

    const fileInput = document.querySelector('input[type="file"]');
    const buffer = new ArrayBuffer(8);
    const docxFile = new File([buffer], 'My Report.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    docxFile.arrayBuffer = vi.fn(() => Promise.resolve(buffer));

    fireEvent.change(fileInput, { target: { files: [docxFile] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Report')).toBeInTheDocument();
    });
  });

  // ── Drag and Drop ──────────────────────────────────────────────────

  it('shows drag overlay on dragover', async () => {
    renderEditor();

    const wrapper = document.querySelector('.word-editor-wrapper');
    fireEvent.dragOver(wrapper, { dataTransfer: { files: [] } });

    await waitFor(() => {
      expect(screen.getByText(/Drop .docx file to import/)).toBeInTheDocument();
    });
  });

  it('hides drag overlay on dragleave', async () => {
    renderEditor();

    const wrapper = document.querySelector('.word-editor-wrapper');
    fireEvent.dragOver(wrapper, { dataTransfer: { files: [] } });

    await waitFor(() => {
      expect(screen.getByText(/Drop .docx file to import/)).toBeInTheDocument();
    });

    fireEvent.dragLeave(wrapper, { dataTransfer: { files: [] } });

    await waitFor(() => {
      expect(screen.queryByText(/Drop .docx file to import/)).not.toBeInTheDocument();
    });
  });

  // ── Export ─────────────────────────────────────────────────────────

  it('exports as .doc when save button is clicked', async () => {
    const { saveAs } = await import('file-saver');
    const user = userEvent.setup();
    renderEditor();

    const saveBtn = screen.getByTitle(/Save as .doc/);
    await user.click(saveBtn);

    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'Untitled Document.doc');
  });

  it('exports as .html when HTML button is clicked', async () => {
    const { saveAs } = await import('file-saver');
    const user = userEvent.setup();
    renderEditor();

    const htmlBtn = screen.getByTitle(/Save as HTML/);
    await user.click(htmlBtn);

    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'Untitled Document.html');
  });

  // ── New Document ───────────────────────────────────────────────────

  it('clears editor content on New Document', async () => {
    const user = userEvent.setup();
    renderEditor();

    const newBtn = screen.getByTitle(/New Document/);
    await user.click(newBtn);

    expect(mockEditor.commands.clearContent).toHaveBeenCalled();
  });

  it('resets title on New Document', async () => {
    const user = userEvent.setup();
    renderEditor();

    // Change title first
    const titleInput = screen.getByDisplayValue('Untitled Document');
    await user.clear(titleInput);
    await user.type(titleInput, 'Custom Title');

    // Click New
    const newBtn = screen.getByTitle(/New Document/);
    await user.click(newBtn);

    expect(screen.getByDisplayValue('Untitled Document')).toBeInTheDocument();
  });

  it('clears localStorage on New Document', async () => {
    localStorage.setItem('toolpilot_word_editor', JSON.stringify({ title: 'Old', content: {} }));
    const user = userEvent.setup();
    renderEditor();

    const newBtn = screen.getByTitle(/New Document/);
    await user.click(newBtn);

    expect(localStorage.getItem('toolpilot_word_editor')).toBeNull();
  });

  // ── Autosave ───────────────────────────────────────────────────────

  it('restores content from localStorage on mount', async () => {
    const savedData = {
      title: 'Saved Doc',
      content: { type: 'doc', content: [] },
      savedAt: Date.now(),
    };
    localStorage.setItem('toolpilot_word_editor', JSON.stringify(savedData));

    renderEditor();

    await waitFor(() => {
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith(savedData.content);
      expect(screen.getByDisplayValue('Saved Doc')).toBeInTheDocument();
    });
  });

  // ── Keyboard Shortcut ──────────────────────────────────────────────

  it('saves to localStorage on Ctrl+S', async () => {
    renderEditor();

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });

    await waitFor(() => {
      const saved = localStorage.getItem('toolpilot_word_editor');
      expect(saved).not.toBeNull();
      const data = JSON.parse(saved);
      expect(data.title).toBe('Untitled Document');
    });
  });

  // ── Table Menu ─────────────────────────────────────────────────────

  it('shows table insert options when table button is clicked', async () => {
    const user = userEvent.setup();
    renderEditor();

    const tableBtn = screen.getByTitle('Table');
    await user.click(tableBtn);

    await waitFor(() => {
      expect(screen.getByText('Insert 3×3 table')).toBeInTheDocument();
      expect(screen.getByText('Insert 4×4 table')).toBeInTheDocument();
      expect(screen.getByText('Insert 5×5 table')).toBeInTheDocument();
    });
  });
});
