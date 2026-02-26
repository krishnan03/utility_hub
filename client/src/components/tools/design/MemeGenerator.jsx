import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FONT_FAMILIES = [
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Comic Sans MS", cursive', label: 'Comic Sans' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
];

const POSITION_PRESETS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
];

const TABS = [
  { id: 'popular', label: 'Popular' },
  { id: 'all', label: 'All Templates' },
  { id: 'upload', label: 'Upload' },
];

function createDefaultTextBox(position = 'top', text = '') {
  return {
    id: crypto.randomUUID(),
    text,
    position,
    fontSize: 40,
    color: '#ffffff',
    stroke: '#000000',
    fontFamily: 'Impact, sans-serif',
  };
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => {
    const ly = startY + i * lineHeight;
    ctx.strokeText(l, x, ly);
    ctx.fillText(l, x, ly);
  });
}

export default function MemeGenerator() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('popular');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [textBoxes, setTextBoxes] = useState([
    createDefaultTextBox('top', 'TOP TEXT'),
    createDefaultTextBox('bottom', 'BOTTOM TEXT'),
  ]);
  const [fontFamily, setFontFamily] = useState('Impact, sans-serif');
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  // Fetch templates from Imgflip
  useEffect(() => {
    let cancelled = false;
    async function fetchTemplates() {
      try {
        const res = await fetch('https://api.imgflip.com/get_memes');
        const data = await res.json();
        if (!cancelled && data.success) {
          setTemplates(data.data.memes);
        } else if (!cancelled) {
          setFetchError(true);
        }
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTemplates();
    return () => { cancelled = true; };
  }, []);

  // Filter templates based on search and tab
  const filteredTemplates = (() => {
    let list = templates;
    if (activeTab === 'popular') list = templates.slice(0, 20);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q));
    }
    return list;
  })();

  // Load template image
  const handleSelectTemplate = useCallback((tpl) => {
    setSelectedTemplate(tpl);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setCanvasSize({ w: img.width, h: img.height });
      setImgSrc(tpl.url);
    };
    img.onerror = () => {
      imgRef.current = null;
      setImgSrc(null);
    };
    img.src = tpl.url;
  }, []);

  // Handle custom upload
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setCanvasSize({ w: img.width, h: img.height });
      setImgSrc(url);
      setSelectedTemplate(null);
    };
    img.src = url;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setCanvasSize({ w: img.width, h: img.height });
      setImgSrc(url);
      setSelectedTemplate(null);
    };
    img.src = url;
  };

  // Text box management
  const addTextBox = () => {
    setTextBoxes(prev => [...prev, createDefaultTextBox('center', '')]);
  };

  const removeTextBox = (id) => {
    setTextBoxes(prev => prev.filter(tb => tb.id !== id));
  };

  const updateTextBox = (id, field, value) => {
    setTextBoxes(prev => prev.map(tb => tb.id === id ? { ...tb, [field]: value } : tb));
  };

  // Canvas drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const MAX_W = 800;
    let W = canvasSize.w;
    let H = canvasSize.h;
    if (W > MAX_W) {
      const ratio = MAX_W / W;
      W = MAX_W;
      H = Math.round(H * ratio);
    }
    canvas.width = W;
    canvas.height = H;

    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#475569';
      ctx.font = '20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select a template or upload an image', W / 2, H / 2);
    }

    // Draw each text box
    textBoxes.forEach(tb => {
      if (!tb.text) return;
      const fs = tb.fontSize;
      ctx.font = `bold ${fs}px ${tb.fontFamily || fontFamily}`;
      ctx.textAlign = 'center';
      ctx.lineWidth = fs / 8;
      ctx.strokeStyle = tb.stroke;
      ctx.fillStyle = tb.color;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      let y;
      if (tb.position === 'top') y = fs + 10;
      else if (tb.position === 'bottom') y = H - 16;
      else y = H / 2 + fs / 3;

      const maxWidth = W - 40;
      const lineHeight = fs * 1.2;
      wrapText(ctx, tb.text.toUpperCase(), W / 2, y, maxWidth, lineHeight);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });
  }, [canvasSize, imgSrc, textBoxes, fontFamily]);

  useEffect(() => { draw(); }, [draw]);

  // Download handlers
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meme.png';
    a.click();
  };

  const handleDownloadJPG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/jpeg', 0.92);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meme.jpg';
    a.click();
  };

  const handleCopyClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }
    } catch {
      // Fallback: silently fail if clipboard API not available
    }
  };

  const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
  const inputStyle = { background: 'rgba(255,255,255,0.06)' };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Template Selection */}
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        {/* Search */}
        {activeTab !== 'upload' && (
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
            style={inputStyle}
          />
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={inputStyle}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(''); }}
              className={`flex-1 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-white shadow-lg'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
              }`}
              style={activeTab === tab.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        {activeTab !== 'upload' ? (
          <div className="overflow-y-auto pr-1" style={{ maxHeight: '400px' }}>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                ))}
              </div>
            ) : fetchError ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-surface-400 text-sm">Couldn't load templates.</p>
                <button
                  onClick={() => { setActiveTab('upload'); }}
                  className="px-4 min-h-[44px] rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
                >
                  Upload your own image
                </button>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-center text-surface-500 text-sm py-8">No templates match "{search}"</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredTemplates.map((tpl) => {
                  const isPopular = templates.indexOf(tpl) < 10;
                  const isSelected = selectedTemplate?.id === tpl.id;
                  return (
                    <motion.button
                      key={tpl.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`relative rounded-xl overflow-hidden text-left transition-all group ${
                        isSelected ? 'ring-2 ring-orange-400' : 'ring-1 ring-white/5 hover:ring-white/15'
                      }`}
                    >
                      <div className="aspect-square overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <img
                          src={tpl.url}
                          alt={tpl.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2 flex items-center gap-1.5">
                        {isPopular && (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}>
                            🔥
                          </span>
                        )}
                        <p className="text-xs text-surface-300 truncate">{tpl.name}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Upload Tab */
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 py-12 rounded-xl cursor-pointer border-2 border-dashed border-white/10 hover:border-orange-400/40 transition-colors group"
          >
            <motion.div whileHover={{ scale: 1.1, y: -4 }} className="text-4xl">📂</motion.div>
            <p className="text-sm text-surface-400 group-hover:text-surface-200 transition-colors">
              Drop an image here or click to upload
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        )}
      </div>

      {/* Canvas Preview */}
      <div className="rounded-2xl p-5 flex items-center justify-center" style={cardStyle}>
        <canvas
          ref={canvasRef}
          className="rounded-xl"
          style={{ maxWidth: '100%', maxHeight: '500px', display: 'block' }}
        />
      </div>

      {/* Text Controls */}
      <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-surface-300">Text Boxes</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addTextBox}
            className="min-h-[44px] px-4 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
          >
            + Add Text
          </motion.button>
        </div>

        <AnimatePresence mode="popLayout">
          {textBoxes.map((tb) => (
            <motion.div
              key={tb.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl p-4 space-y-3"
              style={inputStyle}
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tb.text}
                  onChange={e => updateTextBox(tb.id, 'text', e.target.value)}
                  placeholder="Enter text..."
                  className="flex-1 px-3 py-2 rounded-lg text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                {textBoxes.length > 1 && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => removeTextBox(tb.id)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    aria-label="Remove text box"
                  >
                    ✕
                  </motion.button>
                )}
              </div>

              <div className="flex flex-wrap gap-3 items-end">
                {/* Position */}
                <div className="space-y-1">
                  <label className="text-xs text-surface-500">Position</label>
                  <div className="flex gap-1">
                    {POSITION_PRESETS.map(p => (
                      <button
                        key={p.value}
                        onClick={() => updateTextBox(tb.id, 'position', p.value)}
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-medium transition-colors ${
                          tb.position === p.value
                            ? 'text-white'
                            : 'text-surface-400 hover:text-surface-200'
                        }`}
                        style={tb.position === p.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : { background: 'rgba(255,255,255,0.06)' }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-1 flex-1 min-w-[120px]">
                  <label className="text-xs text-surface-500">Size: {tb.fontSize}px</label>
                  <input
                    type="range"
                    min={16}
                    max={80}
                    value={tb.fontSize}
                    onChange={e => updateTextBox(tb.id, 'fontSize', Number(e.target.value))}
                    className="w-full accent-orange-400"
                  />
                </div>

                {/* Colors */}
                <div className="space-y-1">
                  <label className="text-xs text-surface-500">Fill</label>
                  <input
                    type="color"
                    value={tb.color}
                    onChange={e => updateTextBox(tb.id, 'color', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-surface-500">Stroke</label>
                  <input
                    type="color"
                    value={tb.stroke}
                    onChange={e => updateTextBox(tb.id, 'stroke', e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Font Family Selector */}
        <div className="space-y-1">
          <label className="text-xs text-surface-500">Font Family (all text boxes)</label>
          <div className="flex flex-wrap gap-2">
            {FONT_FAMILIES.map(f => (
              <button
                key={f.value}
                onClick={() => {
                  setFontFamily(f.value);
                  setTextBoxes(prev => prev.map(tb => ({ ...tb, fontFamily: f.value })));
                }}
                className={`min-h-[44px] px-4 rounded-xl text-sm font-medium transition-colors ${
                  fontFamily === f.value
                    ? 'text-white'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
                }`}
                style={fontFamily === f.value ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : inputStyle}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Download Actions */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex flex-wrap gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadPNG}
            className="flex-1 min-h-[48px] min-w-[140px] px-5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
          >
            ⬇ Download PNG
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadJPG}
            className="flex-1 min-h-[48px] min-w-[140px] px-5 rounded-xl text-sm font-semibold text-surface-200 transition-all hover:bg-white/10"
            style={inputStyle}
          >
            ⬇ Download JPG
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyClipboard}
            className="flex-1 min-h-[48px] min-w-[140px] px-5 rounded-xl text-sm font-semibold text-surface-200 transition-all hover:bg-white/10"
            style={inputStyle}
          >
            📋 Copy to Clipboard
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
