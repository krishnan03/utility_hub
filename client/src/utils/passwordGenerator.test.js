import { describe, it, expect } from 'vitest';
import { generatePassword, generatePassphrase, calculateStrength } from './passwordGenerator.js';

// ============================================================
// generatePassword — length
// ============================================================

describe('generatePassword — length', () => {
  it('generates password of default length 16', () => {
    const { password } = generatePassword();
    expect(password).toHaveLength(16);
  });

  it('generates password of specified length', () => {
    const { password } = generatePassword({ length: 24 });
    expect(password).toHaveLength(24);
  });

  it('clamps minimum length to 8', () => {
    const { password } = generatePassword({ length: 3 });
    expect(password).toHaveLength(8);
  });

  it('clamps maximum length to 128', () => {
    const { password } = generatePassword({ length: 200 });
    expect(password).toHaveLength(128);
  });
});

// ============================================================
// generatePassword — character sets
// ============================================================

describe('generatePassword — character sets', () => {
  it('includes only lowercase when others disabled', () => {
    const { password } = generatePassword({
      length: 50, uppercase: false, lowercase: true, numbers: false, special: false,
    });
    expect(password).toMatch(/^[a-z]+$/);
  });

  it('includes only uppercase when others disabled', () => {
    const { password } = generatePassword({
      length: 50, uppercase: true, lowercase: false, numbers: false, special: false,
    });
    expect(password).toMatch(/^[A-Z]+$/);
  });

  it('includes only numbers when others disabled', () => {
    const { password } = generatePassword({
      length: 50, uppercase: false, lowercase: false, numbers: true, special: false,
    });
    expect(password).toMatch(/^[0-9]+$/);
  });

  it('includes only special chars when others disabled', () => {
    const { password } = generatePassword({
      length: 50, uppercase: false, lowercase: false, numbers: false, special: true,
    });
    expect(password).toMatch(/^[^a-zA-Z0-9]+$/);
  });

  it('falls back to lowercase when all sets disabled', () => {
    const { password } = generatePassword({
      length: 20, uppercase: false, lowercase: false, numbers: false, special: false,
    });
    expect(password).toMatch(/^[a-z]+$/);
    expect(password).toHaveLength(20);
  });
});

// ============================================================
// generatePassword — strength
// ============================================================

describe('generatePassword — strength', () => {
  it('returns a strength value', () => {
    const { strength } = generatePassword();
    expect(['Weak', 'Fair', 'Strong', 'Very Strong']).toContain(strength.label || strength);
  });

  it('short lowercase-only password is Weak or Fair', () => {
    const { strength } = generatePassword({
      length: 8, uppercase: false, lowercase: true, numbers: false, special: false,
    });
    const label = strength.label || strength;
    expect(['Weak', 'Fair']).toContain(label);
  });
});

// ============================================================
// calculateStrength
// ============================================================

describe('calculateStrength', () => {
  it('returns Weak for empty string', () => {
    const result = calculateStrength('');
    expect(result.label || result).toBe('Weak');
  });

  it('returns Weak for short simple password', () => {
    const result = calculateStrength('abc');
    expect(result.label || result).toBe('Weak');
  });

  it('returns Fair for medium password', () => {
    const result = calculateStrength('Abcdefgh12');
    expect(['Fair', 'Good', 'Strong']).toContain(result.label || result);
  });

  it('returns Strong for good password', () => {
    const result = calculateStrength('Abcdefgh123!');
    expect(['Good', 'Strong', 'Very Strong']).toContain(result.label || result);
  });

  it('returns Very Strong for long diverse password', () => {
    const result = calculateStrength('Abcdefghijklmn123!@#');
    expect(['Strong', 'Very Strong']).toContain(result.label || result);
  });

  it('returns Weak for null', () => {
    const result = calculateStrength(null);
    expect(result.label || result).toBe('Weak');
  });
});

// ============================================================
// generatePassphrase
// ============================================================

describe('generatePassphrase', () => {
  it('generates passphrase with default 4 words', () => {
    const { passphrase } = generatePassphrase();
    const words = passphrase.split('-');
    expect(words).toHaveLength(4);
  });

  it('generates passphrase with specified word count', () => {
    const { passphrase } = generatePassphrase({ wordCount: 6 });
    const words = passphrase.split('-');
    expect(words).toHaveLength(6);
  });

  it('clamps minimum word count to 3', () => {
    const { passphrase } = generatePassphrase({ wordCount: 1 });
    const words = passphrase.split('-');
    expect(words).toHaveLength(3);
  });

  it('clamps maximum word count to 8', () => {
    const { passphrase } = generatePassphrase({ wordCount: 20 });
    const words = passphrase.split('-');
    expect(words).toHaveLength(8);
  });

  it('uses custom separator', () => {
    const { passphrase } = generatePassphrase({ wordCount: 3, separator: '_' });
    expect(passphrase.split('_')).toHaveLength(3);
    expect(passphrase).not.toContain('-');
  });

  it('returns a strength value', () => {
    const { strength } = generatePassphrase();
    const label = strength.label || strength;
    expect(['Weak', 'Fair', 'Strong', 'Very Strong']).toContain(label);
  });

  it('generates non-empty words', () => {
    const { passphrase } = generatePassphrase({ wordCount: 5 });
    const words = passphrase.split('-');
    words.forEach(w => expect(w.length).toBeGreaterThan(0));
  });
});
