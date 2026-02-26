import { describe, it, expect } from 'vitest';
import { evaluate, factorial } from './scientificCalc.js';

// ============================================================
// Basic Arithmetic
// ============================================================

describe('evaluate — basic arithmetic', () => {
  it('adds two numbers', () => {
    expect(evaluate('2 + 3').result).toBe(5);
  });

  it('subtracts two numbers', () => {
    expect(evaluate('10 - 4').result).toBe(6);
  });

  it('multiplies two numbers', () => {
    expect(evaluate('3 * 7').result).toBe(21);
  });

  it('divides two numbers', () => {
    expect(evaluate('20 / 4').result).toBe(5);
  });

  it('handles negative numbers', () => {
    expect(evaluate('-5 + 3').result).toBe(-2);
  });

  it('handles decimal numbers', () => {
    expect(evaluate('1.5 + 2.5').result).toBe(4);
  });
});

// ============================================================
// Order of Operations
// ============================================================

describe('evaluate — order of operations', () => {
  it('respects multiplication before addition', () => {
    expect(evaluate('2 + 3 * 4').result).toBe(14);
  });

  it('respects division before subtraction', () => {
    expect(evaluate('10 - 6 / 3').result).toBe(8);
  });

  it('handles mixed operations', () => {
    expect(evaluate('2 + 3 * 4 - 1').result).toBe(13);
  });
});

// ============================================================
// Parentheses
// ============================================================

describe('evaluate — parentheses', () => {
  it('evaluates parenthesized expression first', () => {
    expect(evaluate('(2 + 3) * 4').result).toBe(20);
  });

  it('handles nested parentheses', () => {
    expect(evaluate('((2 + 3) * (4 - 1))').result).toBe(15);
  });

  it('handles deeply nested parentheses', () => {
    expect(evaluate('(((1 + 2)))').result).toBe(3);
  });
});

// ============================================================
// Exponentiation
// ============================================================

describe('evaluate — exponentiation', () => {
  it('computes power', () => {
    expect(evaluate('2 ^ 3').result).toBe(8);
  });

  it('computes power with decimals', () => {
    expect(evaluate('4 ^ 0.5').result).toBeCloseTo(2, 10);
  });

  it('handles zero exponent', () => {
    expect(evaluate('5 ^ 0').result).toBe(1);
  });
});

// ============================================================
// Trig Functions — Radians
// ============================================================

describe('evaluate — trig (radians)', () => {
  it('computes sin(0)', () => {
    expect(evaluate('sin(0)').result).toBeCloseTo(0, 10);
  });

  it('computes cos(0)', () => {
    expect(evaluate('cos(0)').result).toBeCloseTo(1, 10);
  });

  it('computes tan(0)', () => {
    expect(evaluate('tan(0)').result).toBeCloseTo(0, 10);
  });

  it('computes sin(pi/2)', () => {
    expect(evaluate('sin(pi / 2)').result).toBeCloseTo(1, 10);
  });

  it('computes cos(pi)', () => {
    expect(evaluate('cos(pi)').result).toBeCloseTo(-1, 10);
  });

  it('computes asin(1)', () => {
    expect(evaluate('asin(1)').result).toBeCloseTo(Math.PI / 2, 10);
  });

  it('computes acos(1)', () => {
    expect(evaluate('acos(1)').result).toBeCloseTo(0, 10);
  });

  it('computes atan(0)', () => {
    expect(evaluate('atan(0)').result).toBeCloseTo(0, 10);
  });
});

// ============================================================
// Trig Functions — Degrees
// ============================================================

describe('evaluate — trig (degrees)', () => {
  it('computes sin(90) in degrees', () => {
    expect(evaluate('sin(90)', 'degrees').result).toBeCloseTo(1, 10);
  });

  it('computes cos(180) in degrees', () => {
    expect(evaluate('cos(180)', 'degrees').result).toBeCloseTo(-1, 10);
  });

  it('computes tan(45) in degrees', () => {
    expect(evaluate('tan(45)', 'degrees').result).toBeCloseTo(1, 10);
  });

  it('computes asin(1) in degrees', () => {
    expect(evaluate('asin(1)', 'degrees').result).toBeCloseTo(90, 10);
  });

  it('computes acos(0) in degrees', () => {
    expect(evaluate('acos(0)', 'degrees').result).toBeCloseTo(90, 10);
  });

  it('computes atan(1) in degrees', () => {
    expect(evaluate('atan(1)', 'degrees').result).toBeCloseTo(45, 10);
  });
});

// ============================================================
// Logarithms
// ============================================================

describe('evaluate — log/ln', () => {
  it('computes log(100) = 2', () => {
    expect(evaluate('log(100)').result).toBeCloseTo(2, 10);
  });

  it('computes log(10) = 1', () => {
    expect(evaluate('log(10)').result).toBeCloseTo(1, 10);
  });

  it('computes ln(e) = 1', () => {
    expect(evaluate('ln(e)').result).toBeCloseTo(1, 10);
  });

  it('computes ln(1) = 0', () => {
    expect(evaluate('ln(1)').result).toBeCloseTo(0, 10);
  });
});

// ============================================================
// sqrt, abs
// ============================================================

describe('evaluate — sqrt and abs', () => {
  it('computes sqrt(144) = 12', () => {
    expect(evaluate('sqrt(144)').result).toBe(12);
  });

  it('computes sqrt(2)', () => {
    expect(evaluate('sqrt(2)').result).toBeCloseTo(Math.SQRT2, 10);
  });

  it('computes abs(-5) = 5', () => {
    expect(evaluate('abs(-5)').result).toBe(5);
  });

  it('computes abs(3) = 3', () => {
    expect(evaluate('abs(3)').result).toBe(3);
  });
});

// ============================================================
// Factorial
// ============================================================

describe('factorial', () => {
  it('computes 0! = 1', () => {
    expect(factorial(0)).toBe(1);
  });

  it('computes 1! = 1', () => {
    expect(factorial(1)).toBe(1);
  });

  it('computes 5! = 120', () => {
    expect(factorial(5)).toBe(120);
  });

  it('computes 10! = 3628800', () => {
    expect(factorial(10)).toBe(3628800);
  });

  it('throws for negative input', () => {
    expect(() => factorial(-1)).toThrow('non-negative integer');
  });

  it('throws for non-integer input', () => {
    expect(() => factorial(2.5)).toThrow('non-negative integer');
  });
});

describe('evaluate — factorial via expression', () => {
  it('computes 5!', () => {
    expect(evaluate('5!').result).toBe(120);
  });

  it('computes (3 + 2)!', () => {
    expect(evaluate('(3 + 2)!').result).toBe(120);
  });
});

// ============================================================
// Constants
// ============================================================

describe('evaluate — constants', () => {
  it('recognizes pi', () => {
    expect(evaluate('pi').result).toBeCloseTo(Math.PI, 10);
  });

  it('recognizes e', () => {
    expect(evaluate('e').result).toBeCloseTo(Math.E, 10);
  });

  it('uses pi in expressions', () => {
    expect(evaluate('2 * pi').result).toBeCloseTo(2 * Math.PI, 10);
  });
});

// ============================================================
// Error Handling
// ============================================================

describe('evaluate — error handling', () => {
  it('returns error for division by zero', () => {
    const r = evaluate('1 / 0');
    expect(r.error).toBeTruthy();
  });

  it('returns error for invalid expression', () => {
    const r = evaluate('2 +* 3');
    expect(r.error).toBeTruthy();
  });

  it('returns error for empty expression', () => {
    const r = evaluate('');
    expect(r.error).toBeTruthy();
  });

  it('returns error for unknown function', () => {
    const r = evaluate('foo(5)');
    expect(r.error).toBeTruthy();
  });

  it('returns error for mismatched parentheses', () => {
    const r = evaluate('(2 + 3');
    expect(r.error).toBeTruthy();
  });

  it('returns error for unexpected characters', () => {
    const r = evaluate('2 & 3');
    expect(r.error).toBeTruthy();
  });
});
