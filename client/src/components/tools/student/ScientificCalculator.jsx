import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { evaluate } from '../../../utils/scientificCalc';

function CalcBtn({ label, onClick, type = 'num', wide = false }) {
  const styles = {
    num: { background: 'rgba(255,255,255,0.08)', color: '#f5f5f7' },
    fn: { background: 'rgba(255,255,255,0.04)', color: '#8e8e93' },
    op: { background: 'rgba(255,159,67,0.15)', color: '#FF9F43' },
    clear: { background: 'rgba(255,69,58,0.12)', color: '#ff453a' },
    eq: { background: 'linear-gradient(135deg, #FF6363, #FF9F43)', color: '#fff' },
  };
  const s = styles[type] || styles.num;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className={`min-h-[48px] rounded-xl text-sm font-bold transition-all ${wide ? 'col-span-2' : ''}`}
      style={s}
    >
      {label}
    </motion.button>
  );
}

export default function ScientificCalculator() {
  const [expression, setExpression] = useState('');
  const [mode, setMode] = useState('radians');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const handleEvaluate = useCallback(() => {
    if (!expression.trim()) return;
    const res = evaluate(expression, mode);
    if (res.error) {
      setError(res.error);
      setResult(null);
    } else {
      setError('');
      setResult(res.result);
      setHistory((prev) => [
        { expression, result: res.result, mode },
        ...prev.slice(0, 9),
      ]);
    }
  }, [expression, mode]);

  // Auto-recalculate when mode changes (if there's an expression)
  useEffect(() => {
    if (expression.trim()) {
      const res = evaluate(expression, mode);
      if (!res.error) {
        setResult(res.result);
        setError('');
      }
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const insertAtCursor = useCallback((text) => {
    setExpression((prev) => prev + text);
  }, []);

  const loadFromHistory = useCallback((entry) => {
    setExpression(entry.expression);
    setResult(entry.result);
    setError('');
  }, []);

  const formatResult = (val) => {
    if (val === null) return '0';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? String(val) : val.toFixed(8).replace(/\.?0+$/, '');
    }
    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {['radians', 'degrees'].map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className="flex-1 min-h-[44px] px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all duration-200"
            style={mode === m
              ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)', color: '#fff' }
              : { color: '#636366' }
            }>
            {m === 'radians' ? 'RAD' : 'DEG'}
          </button>
        ))}
      </div>

      {/* Calculator display */}
      <div className="rounded-2xl p-4" style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between">
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: mode === 'degrees' ? 'rgba(255,159,67,0.2)' : 'rgba(99,99,255,0.2)', color: mode === 'degrees' ? '#FF9F43' : '#818cf8' }}>
            {mode === 'degrees' ? 'DEG' : 'RAD'}
          </span>
        </div>
        <div className="text-right mt-1">
          <p className="text-sm font-mono text-surface-500 h-5 truncate">{expression || '\u00a0'}</p>
          <p className="text-3xl font-mono font-bold text-surface-50 mt-1">
            {error ? <span className="text-red-400 text-lg">{error}</span> : formatResult(result)}
          </p>
        </div>
      </div>

      {/* Button grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {/* Row 1: trig + log functions */}
        {['sin', 'cos', 'tan', 'log', 'ln'].map(fn => (
          <CalcBtn key={fn} label={fn} onClick={() => insertAtCursor(`${fn}(`)} type="fn" />
        ))}
        {/* Row 2: more functions */}
        {['√', 'x²', 'xⁿ', 'π', 'e'].map((fn, i) => (
          <CalcBtn key={fn} label={fn} onClick={() => insertAtCursor(['sqrt(', '^2', '^', 'pi', 'e'][i])} type="fn" />
        ))}
        {/* Row 3: clear + parens + divide */}
        <CalcBtn label="C" onClick={() => { setExpression(''); setResult(null); setError(''); }} type="clear" />
        <CalcBtn label="⌫" onClick={() => setExpression(e => e.slice(0, -1))} type="clear" />
        <CalcBtn label="(" onClick={() => insertAtCursor('(')} type="op" />
        <CalcBtn label=")" onClick={() => insertAtCursor(')')} type="op" />
        <CalcBtn label="÷" onClick={() => insertAtCursor('/')} type="op" />
        {/* Row 4: 7 8 9 × n! */}
        {['7','8','9','×','n!'].map((b,i) => (
          <CalcBtn key={b} label={b} onClick={() => insertAtCursor(['7','8','9','*','!'][i])} type={i >= 3 ? 'op' : 'num'} />
        ))}
        {/* Row 5: 4 5 6 - abs */}
        {['4','5','6','-','abs'].map((b,i) => (
          <CalcBtn key={b} label={b} onClick={() => insertAtCursor(['4','5','6','-','abs('][i])} type={i >= 3 ? 'op' : 'num'} />
        ))}
        {/* Row 6: 1 2 3 + % */}
        {['1','2','3','+','%'].map((b,i) => (
          <CalcBtn key={b} label={b} onClick={() => insertAtCursor(['1','2','3','+','%'][i])} type={i >= 3 ? 'op' : 'num'} />
        ))}
        {/* Row 7: 0 (wide) . = (wide) */}
        <CalcBtn label="0" onClick={() => insertAtCursor('0')} type="num" wide />
        <CalcBtn label="." onClick={() => insertAtCursor('.')} type="num" />
        <CalcBtn label="=" onClick={handleEvaluate} type="eq" wide />
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-2">
            History
          </h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {history.map((entry, i) => (
              <button
                key={i}
                type="button"
                onClick={() => loadFromHistory(entry)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors min-h-[44px]"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <span className="text-sm font-mono text-surface-400 truncate">
                  {entry.expression}
                </span>
                <span className="text-sm font-mono font-bold text-surface-50 shrink-0">
                  = {typeof entry.result === 'number' ? (Number.isInteger(entry.result) ? entry.result : entry.result.toFixed(6).replace(/\.?0+$/, '')) : entry.result}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
