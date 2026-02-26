/**
 * Scientific Calculator Engine
 * Evaluates math expression strings with support for trig, log, sqrt, factorial, etc.
 * Pure client-side, no server calls, no DOM access.
 */

/**
 * Compute factorial of a non-negative integer.
 * @param {number} n
 * @returns {number}
 */
export function factorial(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('Factorial requires a non-negative integer');
  }
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * Tokenize an expression string into numbers, operators, functions, and parentheses.
 */
function tokenize(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Skip whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // Number (including decimals)
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    // Letters → function name or constant
    if (/[a-zA-Z]/.test(ch)) {
      let name = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        name += expr[i++];
      }
      const lower = name.toLowerCase();
      if (lower === 'pi') {
        tokens.push({ type: 'number', value: Math.PI });
      } else if (lower === 'e' && (i >= expr.length || expr[i] !== 'x')) {
        // 'e' constant, but not if part of 'exp' etc. — we already consumed the full name
        tokens.push({ type: 'number', value: Math.E });
      } else {
        tokens.push({ type: 'function', value: lower });
      }
      continue;
    }

    // Operators and parens
    if ('+-*/^()!'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: ${ch}`);
  }

  return tokens;
}

/**
 * Recursive descent parser and evaluator.
 * Grammar:
 *   expr     → term (('+' | '-') term)*
 *   term     → unary (('*' | '/') unary)*
 *   unary    → ('-')? power
 *   power    → postfix ('^' unary)?
 *   postfix  → primary ('!')?
 *   primary  → NUMBER | '(' expr ')' | FUNCTION '(' expr ')'
 */
function parse(tokens, mode) {
  let pos = 0;

  const toRad = (v) => mode === 'degrees' ? (v * Math.PI) / 180 : v;
  const fromRad = (v) => mode === 'degrees' ? (v * 180) / Math.PI : v;

  function peek() { return tokens[pos]; }
  function consume() { return tokens[pos++]; }

  function expect(type, value) {
    const t = consume();
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error('Unexpected token');
    }
    return t;
  }

  function parseExpr() {
    let left = parseTerm();
    while (peek() && peek().type === 'operator' && (peek().value === '+' || peek().value === '-')) {
      const op = consume().value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    while (peek() && peek().type === 'operator' && (peek().value === '*' || peek().value === '/')) {
      const op = consume().value;
      const right = parseUnary();
      if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function parseUnary() {
    if (peek() && peek().type === 'operator' && peek().value === '-') {
      consume();
      return -parsePower();
    }
    if (peek() && peek().type === 'operator' && peek().value === '+') {
      consume();
    }
    return parsePower();
  }

  function parsePower() {
    let base = parsePostfix();
    if (peek() && peek().type === 'operator' && peek().value === '^') {
      consume();
      const exp = parseUnary(); // right-associative
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parsePostfix() {
    let val = parsePrimary();
    while (peek() && peek().type === 'operator' && peek().value === '!') {
      consume();
      val = factorial(val);
    }
    return val;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('Unexpected end of expression');

    // Number
    if (t.type === 'number') {
      consume();
      return t.value;
    }

    // Parenthesized expression
    if (t.type === 'operator' && t.value === '(') {
      consume();
      const val = parseExpr();
      expect('operator', ')');
      return val;
    }

    // Function call
    if (t.type === 'function') {
      const fname = consume().value;
      expect('operator', '(');
      const arg = parseExpr();
      expect('operator', ')');
      return applyFunction(fname, arg);
    }

    throw new Error('Invalid expression');
  }

  function applyFunction(name, arg) {
    switch (name) {
      case 'sin':   return Math.sin(toRad(arg));
      case 'cos':   return Math.cos(toRad(arg));
      case 'tan':   return Math.tan(toRad(arg));
      case 'asin':  return fromRad(Math.asin(arg));
      case 'acos':  return fromRad(Math.acos(arg));
      case 'atan':  return fromRad(Math.atan(arg));
      case 'log':   return Math.log10(arg);
      case 'ln':    return Math.log(arg);
      case 'sqrt':  return Math.sqrt(arg);
      case 'abs':   return Math.abs(arg);
      case 'factorial': return factorial(arg);
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  const result = parseExpr();
  if (pos < tokens.length) {
    throw new Error('Unexpected token after expression');
  }
  return result;
}

/**
 * Evaluate a math expression string.
 * @param {string} expression
 * @param {'radians'|'degrees'} [mode='radians']
 * @returns {{ result: number, error?: string }}
 */
export function evaluate(expression, mode = 'radians') {
  try {
    if (!expression || !expression.trim()) {
      return { result: 0, error: 'Empty expression' };
    }
    const tokens = tokenize(expression.trim());
    const result = parse(tokens, mode);

    if (!isFinite(result)) {
      return { result, error: 'Result is not finite' };
    }
    return { result };
  } catch (err) {
    return { result: 0, error: err.message };
  }
}
