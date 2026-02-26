import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function GlassCard({ children, className = '', style = {}, ...props }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: 'rgba(44,44,46,0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Solvers ─────────────────────────────────────────────────────────────────

function solveLinear(equation) {
  const steps = [];
  const cleaned = equation.replace(/\s+/g, '');
  const eqParts = cleaned.split('=');
  if (eqParts.length !== 2) return [{ description: 'Error', expression: 'Equation must contain exactly one "=" sign.', isError: true }];

  steps.push({ description: 'Start with the equation', expression: equation.trim() });

  // Collect terms: move everything to left side = 0
  // Parse terms like 3x, -2x, 5, -7
  const parseTerms = (str) => {
    const terms = [];
    const regex = /([+-]?)(\d*\.?\d*)(x?)/g;
    let m;
    while ((m = regex.exec(str)) !== null) {
      if (m[0] === '') { regex.lastIndex++; continue; }
      const sign = m[1] === '-' ? -1 : 1;
      const hasX = m[3] === 'x';
      const coeff = m[2] === '' ? (hasX ? 1 : 0) : parseFloat(m[2]);
      if (coeff === 0 && !hasX) continue;
      terms.push({ coeff: sign * coeff, hasX });
    }
    return terms;
  };

  const leftTerms = parseTerms(eqParts[0]);
  const rightTerms = parseTerms(eqParts[1]);

  let a = 0, b = 0; // ax + b = 0
  for (const t of leftTerms) { if (t.hasX) a += t.coeff; else b += t.coeff; }
  for (const t of rightTerms) { if (t.hasX) a -= t.coeff; else b -= t.coeff; }

  steps.push({ description: 'Rearrange to standard form', expression: `${a}x + ${b} = 0` });

  if (a === 0) {
    if (b === 0) {
      steps.push({ description: 'Identity', expression: 'Infinite solutions (equation is always true)', isResult: true });
    } else {
      steps.push({ description: 'Contradiction', expression: 'No solution (equation is never true)', isResult: true });
    }
    return steps;
  }

  steps.push({ description: `Move constant to the right side`, expression: `${a}x = ${-b}` });
  const result = -b / a;
  steps.push({ description: `Divide both sides by ${a}`, expression: `x = ${-b} / ${a}` });
  steps.push({ description: 'Solution', expression: `x = ${Number.isInteger(result) ? result : result.toFixed(6)}`, isResult: true });
  return steps;
}

function solveQuadratic(equation) {
  const steps = [];
  const cleaned = equation.replace(/\s+/g, '').replace(/\^2/g, '²');

  steps.push({ description: 'Start with the equation', expression: equation.trim() });

  // Parse ax² + bx + c = 0
  const eqParts = cleaned.split('=');
  const lhs = eqParts[0] || '';
  const rhs = eqParts.length > 1 ? eqParts[1] : '0';

  // Simple coefficient extraction
  const extractCoeffs = (str) => {
    let a = 0, b = 0, c = 0;
    // Match x² terms
    const x2Match = str.match(/([+-]?\d*\.?\d*)x²/);
    if (x2Match) a = x2Match[1] === '' || x2Match[1] === '+' ? 1 : x2Match[1] === '-' ? -1 : parseFloat(x2Match[1]);
    // Match x terms (not x²)
    const xMatch = str.replace(/[+-]?\d*\.?\d*x²/g, '').match(/([+-]?\d*\.?\d*)x/);
    if (xMatch) b = xMatch[1] === '' || xMatch[1] === '+' ? 1 : xMatch[1] === '-' ? -1 : parseFloat(xMatch[1]);
    // Match constant terms
    const constStr = str.replace(/[+-]?\d*\.?\d*x²/g, '').replace(/[+-]?\d*\.?\d*x/g, '');
    if (constStr) c = parseFloat(constStr) || 0;
    return { a, b, c };
  };

  const left = extractCoeffs(lhs);
  const right = extractCoeffs(rhs);
  const a = left.a - right.a;
  const b = left.b - right.b;
  const c = left.c - right.c;

  if (a === 0) return [{ description: 'Error', expression: 'This is not a quadratic equation (coefficient of x² is 0).', isError: true }];

  steps.push({ description: 'Identify coefficients', expression: `a = ${a}, b = ${b}, c = ${c}` });

  const discriminant = b * b - 4 * a * c;
  steps.push({ description: 'Calculate discriminant: b² − 4ac', expression: `Δ = (${b})² − 4(${a})(${c}) = ${discriminant}` });

  if (discriminant > 0) {
    const sqrtD = Math.sqrt(discriminant);
    steps.push({ description: 'Discriminant > 0 → two real solutions', expression: `√Δ = ${sqrtD.toFixed(6)}` });
    steps.push({ description: 'Apply quadratic formula', expression: `x = (−b ± √Δ) / 2a` });
    const x1 = (-b + sqrtD) / (2 * a);
    const x2 = (-b - sqrtD) / (2 * a);
    steps.push({ description: 'Calculate x₁', expression: `x₁ = (${-b} + ${sqrtD.toFixed(6)}) / ${2 * a} = ${x1.toFixed(6)}` });
    steps.push({ description: 'Calculate x₂', expression: `x₂ = (${-b} − ${sqrtD.toFixed(6)}) / ${2 * a} = ${x2.toFixed(6)}` });
    steps.push({ description: 'Solutions', expression: `x₁ = ${x1.toFixed(6)}, x₂ = ${x2.toFixed(6)}`, isResult: true });
  } else if (discriminant === 0) {
    const x = -b / (2 * a);
    steps.push({ description: 'Discriminant = 0 → one repeated root', expression: `x = −b / 2a = ${-b} / ${2 * a}` });
    steps.push({ description: 'Solution', expression: `x = ${x.toFixed(6)}`, isResult: true });
  } else {
    const realPart = (-b / (2 * a)).toFixed(6);
    const imagPart = (Math.sqrt(-discriminant) / (2 * a)).toFixed(6);
    steps.push({ description: 'Discriminant < 0 → two complex solutions', expression: `√|Δ| = ${Math.sqrt(-discriminant).toFixed(6)}` });
    steps.push({ description: 'Solutions', expression: `x₁ = ${realPart} + ${imagPart}i, x₂ = ${realPart} − ${imagPart}i`, isResult: true });
  }
  return steps;
}

function simplifyExpression(expr) {
  const steps = [];
  steps.push({ description: 'Start with the expression', expression: expr.trim() });

  // Collect like terms: coefficients of x, constants
  const cleaned = expr.replace(/\s+/g, '');
  let xCoeff = 0, constant = 0;
  const regex = /([+-]?)(\d*\.?\d*)(x?)/g;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    if (m[0] === '') { regex.lastIndex++; continue; }
    const sign = m[1] === '-' ? -1 : 1;
    const hasX = m[3] === 'x';
    const coeff = m[2] === '' ? (hasX ? 1 : 0) : parseFloat(m[2]);
    if (coeff === 0 && !hasX) continue;
    if (hasX) xCoeff += sign * coeff;
    else constant += sign * coeff;
  }

  steps.push({ description: 'Combine like terms', expression: `x terms: ${xCoeff}x, constants: ${constant}` });

  const parts = [];
  if (xCoeff !== 0) parts.push(xCoeff === 1 ? 'x' : xCoeff === -1 ? '-x' : `${xCoeff}x`);
  if (constant !== 0 || parts.length === 0) {
    if (parts.length > 0 && constant > 0) parts.push(`+ ${constant}`);
    else parts.push(`${constant}`);
  }

  steps.push({ description: 'Simplified expression', expression: parts.join(' '), isResult: true });
  return steps;
}

function solveDerivative(expr) {
  const steps = [];
  const cleaned = expr.replace(/\s+/g, '');
  steps.push({ description: 'Find the derivative of', expression: expr.trim() });
  steps.push({ description: 'Apply the power rule: d/dx(xⁿ) = n·xⁿ⁻¹', expression: 'For each term, multiply by the exponent and reduce the exponent by 1' });

  // Parse terms like 3x^2, -5x, 7
  const terms = [];
  const regex = /([+-]?\d*\.?\d*)(x?)(?:\^(\d+))?/g;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    if (m[0] === '') { regex.lastIndex++; continue; }
    const hasX = m[2] === 'x';
    const coeffStr = m[1];
    const coeff = coeffStr === '' || coeffStr === '+' ? 1 : coeffStr === '-' ? -1 : parseFloat(coeffStr);
    const power = hasX ? (m[3] ? parseInt(m[3]) : 1) : 0;
    if (coeff === 0 && !hasX) continue;
    terms.push({ coeff, power });
  }

  const derivTerms = [];
  for (const t of terms) {
    if (t.power === 0) {
      steps.push({ description: `d/dx(${t.coeff}) = 0`, expression: 'Constant rule' });
      continue;
    }
    const newCoeff = t.coeff * t.power;
    const newPower = t.power - 1;
    const termStr = newPower === 0 ? `${newCoeff}` : newPower === 1 ? `${newCoeff}x` : `${newCoeff}x^${newPower}`;
    steps.push({ description: `d/dx(${t.coeff}x^${t.power}) = ${t.power} · ${t.coeff}x^${t.power - 1}`, expression: `= ${termStr}` });
    derivTerms.push(termStr);
  }

  const result = derivTerms.length > 0 ? derivTerms.join(' + ').replace(/\+ -/g, '- ') : '0';
  steps.push({ description: 'Derivative', expression: `f\'(x) = ${result}`, isResult: true });
  return steps;
}

function solveIntegral(expr) {
  const steps = [];
  const cleaned = expr.replace(/\s+/g, '');
  steps.push({ description: 'Find the integral of', expression: expr.trim() });
  steps.push({ description: 'Apply the power rule: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C', expression: 'For each term, increase the exponent by 1 and divide by the new exponent' });

  const terms = [];
  const regex = /([+-]?\d*\.?\d*)(x?)(?:\^(\d+))?/g;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    if (m[0] === '') { regex.lastIndex++; continue; }
    const hasX = m[2] === 'x';
    const coeffStr = m[1];
    const coeff = coeffStr === '' || coeffStr === '+' ? 1 : coeffStr === '-' ? -1 : parseFloat(coeffStr);
    const power = hasX ? (m[3] ? parseInt(m[3]) : 1) : 0;
    if (coeff === 0 && !hasX) continue;
    terms.push({ coeff, power });
  }

  const intTerms = [];
  for (const t of terms) {
    const newPower = t.power + 1;
    const newCoeff = t.coeff / newPower;
    const coeffStr = newCoeff === 1 ? '' : newCoeff === -1 ? '-' : Number.isInteger(newCoeff) ? `${newCoeff}` : `(${t.coeff}/${newPower})`;
    const termStr = newPower === 1 ? `${coeffStr}x` : `${coeffStr}x^${newPower}`;
    steps.push({ description: `∫${t.coeff}x^${t.power} dx = ${t.coeff}·x^${newPower}/${newPower}`, expression: `= ${termStr}` });
    intTerms.push(termStr);
  }

  const result = intTerms.length > 0 ? intTerms.join(' + ').replace(/\+ -/g, '- ') + ' + C' : 'C';
  steps.push({ description: 'Integral', expression: `∫f(x)dx = ${result}`, isResult: true });
  return steps;
}

const PROBLEM_TYPES = [
  { id: 'linear', label: 'Linear Equation', placeholder: '2x + 3 = 7', icon: '📐' },
  { id: 'quadratic', label: 'Quadratic Equation', placeholder: 'x^2 + 5x + 6 = 0', icon: '📈' },
  { id: 'simplify', label: 'Simplify Expression', placeholder: '3x + 2x - x + 5 - 2', icon: '✨' },
  { id: 'derivative', label: 'Derivative', placeholder: '3x^2 + 2x + 1', icon: '📉' },
  { id: 'integral', label: 'Integral', placeholder: '2x^3 + 3x + 1', icon: '∫' },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MathSolver() {
  const [problemType, setProblemType] = useState('linear');
  const [input, setInput] = useState('');
  const [steps, setSteps] = useState(null);
  const [copied, setCopied] = useState(false);

  const currentType = PROBLEM_TYPES.find((t) => t.id === problemType);

  const handleSolve = useCallback(() => {
    if (!input.trim()) return;
    let result;
    switch (problemType) {
      case 'linear': result = solveLinear(input); break;
      case 'quadratic': result = solveQuadratic(input); break;
      case 'simplify': result = simplifyExpression(input); break;
      case 'derivative': result = solveDerivative(input); break;
      case 'integral': result = solveIntegral(input); break;
      default: result = [{ description: 'Error', expression: 'Unknown problem type', isError: true }];
    }
    setSteps(result);
  }, [input, problemType]);

  const handleCopy = useCallback(() => {
    if (!steps) return;
    const text = steps.map((s, i) => `Step ${i + 1}: ${s.description}\n  ${s.expression}`).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [steps]);

  const handleReset = useCallback(() => {
    setInput('');
    setSteps(null);
    setCopied(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSolve();
  }, [handleSolve]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Step 1: Problem type selector ──────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-surface-300 mb-3">Problem Type</label>
        <div className="flex flex-wrap gap-2">
          {PROBLEM_TYPES.map((type) => (
            <motion.button
              key={type.id}
              type="button"
              onClick={() => { setProblemType(type.id); setSteps(null); }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                problemType === type.id
                  ? 'text-white'
                  : 'text-surface-400 hover:text-surface-300 bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
              style={problemType === type.id ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' } : {}}
            >
              <span aria-hidden="true">{type.icon}</span>
              {type.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Step 2: Input ─────────────────────────────────────────────── */}
      <GlassCard className="p-5 space-y-4">
        <label htmlFor="math-input" className="block text-sm font-semibold text-surface-300">
          {problemType === 'derivative' ? 'Enter f(x) to differentiate' :
           problemType === 'integral' ? 'Enter f(x) to integrate' :
           problemType === 'simplify' ? 'Enter expression to simplify' :
           'Enter your equation'}
        </label>
        <input
          id="math-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentType?.placeholder || ''}
          className="w-full px-4 py-3 rounded-xl text-lg font-mono text-surface-100 placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
        <motion.button
          type="button"
          onClick={handleSolve}
          disabled={!input.trim()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full min-h-[48px] px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }}
        >
          🧮 Solve Step-by-Step
        </motion.button>
      </GlassCard>

      {/* ── Step 3: Solution steps ────────────────────────────────────── */}
      <AnimatePresence>
        {steps && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="space-y-3"
          >
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.25 }}
              >
                <GlassCard
                  className="p-4"
                  style={step.isResult ? {
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.12))',
                    border: '1px solid rgba(16,185,129,0.25)',
                  } : step.isError ? {
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  } : {}}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.isResult ? 'bg-emerald-500/20 text-emerald-400' :
                      step.isError ? 'bg-red-500/20 text-red-400' :
                      'bg-white/[0.08] text-surface-400'
                    }`}>
                      {step.isResult ? '✓' : step.isError ? '!' : idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold mb-1 ${step.isResult ? 'text-emerald-400' : step.isError ? 'text-red-400' : 'text-surface-400'}`}>
                        {step.description}
                      </p>
                      <p className={`font-mono text-sm break-all ${step.isResult ? 'text-emerald-300 text-base font-bold' : step.isError ? 'text-red-300' : 'text-surface-200'}`}>
                        {step.expression}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}

            {/* Action buttons */}
            <div className="flex gap-3">
              <motion.button
                type="button"
                onClick={handleCopy}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-surface-300 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {copied ? '✅ Copied!' : '📋 Copy Solution'}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleReset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-semibold text-surface-300 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                🔄 Try Another
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
