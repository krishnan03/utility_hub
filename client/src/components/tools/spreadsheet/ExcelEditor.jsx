import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

/**
 * Online Excel Editor — flagship spreadsheet tool powered by Univer + SheetJS.
 * 100% client-side: no data ever leaves the browser.
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const AUTOSAVE_KEY = 'toolpilot_excel_autosave';
const AUTOSAVE_DELAY = 3000;
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

// ── SheetJS → Univer conversion ──────────────────────────────────────
function sheetJSToUniverData(workbook, fileName) {
  const sheets = {};
  const sheetOrder = [];

  workbook.SheetNames.forEach((name, index) => {
    const ws = workbook.Sheets[name];
    const ref = ws['!ref'] || 'A1';
    const range = XLSX.utils.decode_range(ref);
    const sheetId = `sheet_${index}`;
    sheetOrder.push(sheetId);

    const cellData = {};
    for (let r = range.s.r; r <= range.e.r; r++) {
      cellData[r] = {};
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;

        const univerCell = {};
        if (cell.f) univerCell.f = cell.f;
        if (cell.t === 'n') univerCell.v = cell.v;
        else if (cell.t === 's') univerCell.v = cell.v;
        else if (cell.t === 'b') univerCell.v = cell.v ? 1 : 0;

        cellData[r][c] = univerCell;
      }
    }

    // Merge cells
    const merges = ws['!merges'] || [];
    const mergeData = merges.map((m) => ({
      startRow: m.s.r,
      startColumn: m.s.c,
      endRow: m.e.r,
      endColumn: m.e.c,
    }));

    // Column widths
    const colWidths = {};
    if (ws['!cols']) {
      ws['!cols'].forEach((col, i) => {
        if (col && col.wpx) {
          colWidths[i] = col.wpx;
        }
      });
    }

    sheets[sheetId] = {
      id: sheetId,
      name,
      cellData,
      rowCount: Math.max(range.e.r + 10, 100),
      columnCount: Math.max(range.e.c + 5, 26),
      mergeData: mergeData.length > 0 ? mergeData : undefined,
      defaultColumnWidth: 88,
      defaultRowHeight: 24,
    };
  });

  return {
    id: 'workbook_imported',
    sheetOrder,
    sheets,
    locale: 'en-US',
    name: fileName || 'Workbook',
  };
}

// ── Univer → SheetJS conversion ──────────────────────────────────────
function univerDataToSheetJS(univerAPI) {
  const workbook = XLSX.utils.book_new();
  const fWorkbook = univerAPI.getActiveWorkbook();
  if (!fWorkbook) return workbook;

  const snapshot = fWorkbook.getSnapshot();
  const sheetOrder = snapshot.sheetOrder || [];

  for (const sheetId of sheetOrder) {
    const sheetData = snapshot.sheets[sheetId];
    if (!sheetData) continue;

    const cellData = sheetData.cellData || {};
    const rowKeys = Object.keys(cellData).map(Number).filter((n) => !isNaN(n));
    if (rowKeys.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['']]);
      XLSX.utils.book_append_sheet(workbook, ws, sheetData.name || `Sheet${sheetOrder.indexOf(sheetId) + 1}`);
      continue;
    }
    const maxRow = Math.max(...rowKeys);

    const aoa = [];
    for (let r = 0; r <= maxRow; r++) {
      const row = [];
      const rowData = cellData[r] || {};
      const colKeys = Object.keys(rowData).map(Number).filter((n) => !isNaN(n));
      const maxCol = colKeys.length > 0 ? Math.max(...colKeys) : 0;
      for (let c = 0; c <= maxCol; c++) {
        const cell = rowData[c];
        row.push(cell?.v ?? '');
      }
      aoa.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook, ws, sheetData.name || `Sheet${sheetOrder.indexOf(sheetId) + 1}`);
  }

  return workbook;
}

// ── Stat helpers ─────────────────────────────────────────────────────
function getWorkbookStats(univerAPI) {
  try {
    const fWorkbook = univerAPI?.getActiveWorkbook();
    if (!fWorkbook) return { sheets: 0, cells: 0 };
    const snapshot = fWorkbook.getSnapshot();
    const sheetCount = (snapshot.sheetOrder || []).length;
    let cellCount = 0;
    for (const sheetId of snapshot.sheetOrder || []) {
      const sd = snapshot.sheets[sheetId];
      if (!sd?.cellData) continue;
      for (const r of Object.values(sd.cellData)) {
        if (r && typeof r === 'object') cellCount += Object.keys(r).length;
      }
    }
    return { sheets: sheetCount, cells: cellCount };
  } catch {
    return { sheets: 0, cells: 0 };
  }
}


// ── Main Component ───────────────────────────────────────────────────
export default function ExcelEditor() {
  const containerRef = useRef(null);
  const univerRef = useRef(null);     // { univerAPI }
  const fileInputRef = useRef(null);
  const autosaveTimer = useRef(null);

  const [fileName, setFileName] = useState('Untitled Spreadsheet');
  const [isEditingName, setIsEditingName] = useState(false);
  const [status, setStatus] = useState('idle');       // idle | loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [stats, setStats] = useState({ sheets: 0, cells: 0 });
  const [toast, setToast] = useState(null);

  // ── Toast helper ─────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Autosave to localStorage ─────────────────────────────────────
  const triggerAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      try {
        if (!univerRef.current) return;
        const wb = univerRef.current.getActiveWorkbook();
        if (!wb) return;
        const snapshot = wb.getSnapshot();
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ snapshot, fileName }));
      } catch { /* quota exceeded — silently ignore */ }
    }, AUTOSAVE_DELAY);
  }, [fileName]);

  // ── Initialize Univer ────────────────────────────────────────────
  const initUniver = useCallback(async (workbookData) => {
    // Dispose previous instance
    if (univerRef.current) {
      try { univerRef.current.dispose(); } catch { /* noop */ }
      univerRef.current = null;
    }

    // Clear container
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    try {
      setStatus('loading');

      const { createUniver, LocaleType, mergeLocales } = await import('@univerjs/presets');
      const { UniverSheetsCorePreset } = await import('@univerjs/preset-sheets-core');
      const localeModule = await import('@univerjs/preset-sheets-core/locales/en-US');
      const UniverPresetSheetsCoreEnUS = localeModule.default || localeModule;

      // Dynamically import CSS (idempotent)
      await import('@univerjs/preset-sheets-core/lib/index.css');

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
        },
        presets: [
          UniverSheetsCorePreset({ container }),
        ],
      });

      univerRef.current = univerAPI;

      if (workbookData) {
        univerAPI.createWorkbook(workbookData);
      } else {
        univerAPI.createWorkbook({});
      }

      setStatus('ready');
      setErrorMsg('');

      // Update stats periodically
      const updateStats = () => setStats(getWorkbookStats(univerAPI));
      updateStats();
      const statsInterval = setInterval(updateStats, 5000);

      // Listen for changes to trigger autosave
      const onCommandExecuted = univerAPI.onCommandExecuted?.((cmd) => {
        triggerAutosave();
        updateStats();
      });

      // Store cleanup refs
      container._cleanup = () => {
        clearInterval(statsInterval);
        if (onCommandExecuted?.dispose) onCommandExecuted.dispose();
      };
    } catch (err) {
      console.error('Univer init failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to initialize spreadsheet engine');
    }
  }, [triggerAutosave]);

  // ── Mount: init with autosaved data or blank ─────────────────────
  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      // Try restoring autosave
      try {
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
          const { snapshot, fileName: savedName } = JSON.parse(saved);
          if (mounted && snapshot) {
            setFileName(savedName || 'Untitled Spreadsheet');
            await initUniver(snapshot);
            return;
          }
        }
      } catch { /* corrupt autosave — ignore */ }

      if (mounted) await initUniver(null);
    };

    boot();

    return () => {
      mounted = false;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      const container = containerRef.current;
      if (container?._cleanup) container._cleanup();
      if (univerRef.current) {
        try { univerRef.current.dispose(); } catch { /* noop */ }
        univerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleExportXLSX();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fileName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── File import ──────────────────────────────────────────────────
  const handleFileImport = useCallback(async (file) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast('File too large (max 50 MB)', 'error');
      return;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      showToast('Unsupported format. Use .xlsx, .xls, or .csv', 'error');
      return;
    }

    try {
      setStatus('loading');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array', cellFormula: true });
      const baseName = file.name.replace(/\.[^.]+$/, '');
      setFileName(baseName);

      const univerData = sheetJSToUniverData(wb, baseName);

      // If Univer is already running, dispose active workbook and create new one
      // without recreating the entire Univer instance
      if (univerRef.current) {
        try {
          const activeWb = univerRef.current.getActiveWorkbook();
          if (activeWb) {
            // Close the active workbook by its ID
            const wbId = activeWb.getId();
            if (wbId) {
              try { univerRef.current.disposeUnit(wbId); } catch { /* noop */ }
            }
          }
        } catch { /* noop */ }

        // Create new workbook with imported data
        univerRef.current.createWorkbook(univerData);
        setStatus('ready');
        setStats(getWorkbookStats(univerRef.current));
        showToast(`Imported "${file.name}" successfully`);
      } else {
        // Univer not initialized yet — full init
        await initUniver(univerData);
        showToast(`Imported "${file.name}" successfully`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      setStatus('error');
      setErrorMsg('Failed to parse file: ' + (err.message || 'Unknown error'));
      showToast('Import failed — file may be corrupted', 'error');
    }
  }, [initUniver, showToast]);

  // ── Export XLSX ──────────────────────────────────────────────────
  const handleExportXLSX = useCallback(() => {
    if (!univerRef.current) return;
    try {
      const wb = univerDataToSheetJS(univerRef.current);
      XLSX.writeFile(wb, `${fileName || 'spreadsheet'}.xlsx`);
      showToast('Downloaded as XLSX');
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  }, [fileName, showToast]);

  // ── Export CSV ───────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    if (!univerRef.current) return;
    try {
      const wb = univerDataToSheetJS(univerRef.current);
      if (wb.SheetNames.length === 0) return;
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'spreadsheet'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded as CSV');
    } catch (err) {
      showToast('CSV export failed: ' + err.message, 'error');
    }
  }, [fileName, showToast]);

  // ── New spreadsheet ──────────────────────────────────────────────
  const handleNew = useCallback(async () => {
    setFileName('Untitled Spreadsheet');
    localStorage.removeItem(AUTOSAVE_KEY);

    if (univerRef.current) {
      try {
        const activeWb = univerRef.current.getActiveWorkbook();
        if (activeWb) {
          const wbId = activeWb.getId();
          if (wbId) {
            try { univerRef.current.disposeUnit(wbId); } catch { /* noop */ }
          }
        }
      } catch { /* noop */ }
      univerRef.current.createWorkbook({});
      setStats(getWorkbookStats(univerRef.current));
      showToast('New spreadsheet created');
    } else {
      await initUniver(null);
      showToast('New spreadsheet created');
    }
  }, [initUniver, showToast]);

  // ── Drag & drop ──────────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileImport(file);
  }, [handleFileImport]);

  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFileImport(file);
    e.target.value = '';
  }, [handleFileImport]);


  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      className="relative flex flex-col -m-5"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── Drag overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl"
            style={{
              background: 'rgba(28, 28, 30, 0.92)',
              border: '2px dashed rgba(255, 99, 99, 0.6)',
            }}
          >
            <div className="text-center">
              <span className="text-5xl block mb-3">📊</span>
              <p className="text-lg font-semibold text-surface-100">Drop your spreadsheet here</p>
              <p className="text-sm text-surface-400 mt-1">.xlsx, .xls, or .csv</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header bar ───────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-wrap"
        style={{
          background: 'rgba(28, 28, 30, 0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-300 transition-all hover:bg-white/10 hover:text-surface-100"
            title="New spreadsheet"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-300 transition-all hover:bg-white/10 hover:text-surface-100"
            title="Open .xlsx, .xls, or .csv"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Open
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            onClick={handleExportXLSX}
            disabled={status !== 'ready'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: status === 'ready' ? 'linear-gradient(135deg, #FF6363, #FF9F43)' : 'rgba(255,255,255,0.06)',
            }}
            title="Download as XLSX (Ctrl+S)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Save .xlsx
          </button>

          <button
            onClick={handleExportCSV}
            disabled={status !== 'ready'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-300 transition-all hover:bg-white/10 hover:text-surface-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download active sheet as CSV"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            .csv
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* File name */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              autoFocus
              className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm text-surface-100 outline-none focus:border-[#FF6363]/50 w-48"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingName(false);
              }}
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm text-surface-300 hover:text-surface-100 transition-colors truncate max-w-[200px]"
              title="Click to rename"
            >
              📄 {fileName}
            </button>
          )}
        </div>
      </div>

      {/* ── Spreadsheet container ────────────────────────────────── */}
      <div className="relative" style={{ minHeight: '600px', height: 'calc(100vh - 280px)' }}>
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(28,28,30,0.9)' }}>
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 animate-spin text-[#FF6363]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-surface-400">Loading spreadsheet engine...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(28,28,30,0.95)' }}>
            <div className="text-center max-w-md px-6">
              <span className="text-4xl block mb-3">⚠️</span>
              <h3 className="text-lg font-semibold text-surface-100 mb-2">Something went wrong</h3>
              <p className="text-sm text-surface-400 mb-4">{errorMsg || 'Failed to load the spreadsheet engine.'}</p>
              <button onClick={() => initUniver(null)} className="btn-primary text-sm">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Univer mounts here */}
        <div
          ref={containerRef}
          className="univer-container w-full h-full"
          style={{ minHeight: '600px', height: '100%' }}
        />
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: 'rgba(28, 28, 30, 0.95)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-4 text-xs text-surface-500">
          <span>{stats.sheets} sheet{stats.sheets !== 1 ? 's' : ''}</span>
          <span>{stats.cells.toLocaleString()} cell{stats.cells !== 1 ? 's' : ''} with data</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-surface-500">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
          100% client-side — your data never leaves your browser
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-[9999] px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg"
            style={{
              background: toast.type === 'error'
                ? 'rgba(239, 68, 68, 0.9)'
                : 'rgba(34, 197, 94, 0.9)',
              backdropFilter: 'blur(12px)',
              color: '#fff',
            }}
          >
            {toast.type === 'error' ? '✕ ' : '✓ '}{toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
