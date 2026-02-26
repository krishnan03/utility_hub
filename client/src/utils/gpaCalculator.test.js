import { describe, it, expect } from 'vitest';
import { GRADE_SCALE, calculateGPA, calculateSemesterGPA } from './gpaCalculator.js';

// ============================================================
// Grade Scale
// ============================================================

describe('GRADE_SCALE', () => {
  it('maps A to 4.0', () => {
    expect(GRADE_SCALE['A']).toBe(4.0);
  });

  it('maps A- to 3.7', () => {
    expect(GRADE_SCALE['A-']).toBe(3.7);
  });

  it('maps B+ to 3.3', () => {
    expect(GRADE_SCALE['B+']).toBe(3.3);
  });

  it('maps B to 3.0', () => {
    expect(GRADE_SCALE['B']).toBe(3.0);
  });

  it('maps B- to 2.7', () => {
    expect(GRADE_SCALE['B-']).toBe(2.7);
  });

  it('maps C+ to 2.3', () => {
    expect(GRADE_SCALE['C+']).toBe(2.3);
  });

  it('maps C to 2.0', () => {
    expect(GRADE_SCALE['C']).toBe(2.0);
  });

  it('maps C- to 1.7', () => {
    expect(GRADE_SCALE['C-']).toBe(1.7);
  });

  it('maps D+ to 1.3', () => {
    expect(GRADE_SCALE['D+']).toBe(1.3);
  });

  it('maps D to 1.0', () => {
    expect(GRADE_SCALE['D']).toBe(1.0);
  });

  it('maps F to 0.0', () => {
    expect(GRADE_SCALE['F']).toBe(0.0);
  });

  it('has exactly 11 grade entries', () => {
    expect(Object.keys(GRADE_SCALE)).toHaveLength(11);
  });
});

// ============================================================
// calculateGPA
// ============================================================

describe('calculateGPA', () => {
  it('calculates GPA for a single course', () => {
    const result = calculateGPA([{ name: 'Math', credits: 3, grade: 'A' }]);
    expect(result.gpa).toBe(4.0);
    expect(result.totalCredits).toBe(3);
    expect(result.totalQualityPoints).toBe(12.0);
  });

  it('calculates GPA for multiple courses', () => {
    const courses = [
      { name: 'Math', credits: 4, grade: 'A' },
      { name: 'English', credits: 3, grade: 'B+' },
    ];
    const result = calculateGPA(courses);
    // (4*4.0 + 3*3.3) / 7 = (16 + 9.9) / 7 = 25.9 / 7 ≈ 3.7
    expect(result.gpa).toBe(3.7);
    expect(result.totalCredits).toBe(7);
    expect(result.totalQualityPoints).toBe(25.9);
  });

  it('returns 0 for empty array', () => {
    const result = calculateGPA([]);
    expect(result.gpa).toBe(0);
    expect(result.totalCredits).toBe(0);
    expect(result.totalQualityPoints).toBe(0);
  });

  it('returns 0 for null/undefined input', () => {
    expect(calculateGPA(null).gpa).toBe(0);
    expect(calculateGPA(undefined).gpa).toBe(0);
  });

  it('skips courses with 0 credits', () => {
    const courses = [
      { name: 'Math', credits: 0, grade: 'A' },
      { name: 'English', credits: 3, grade: 'B' },
    ];
    const result = calculateGPA(courses);
    expect(result.gpa).toBe(3.0);
    expect(result.totalCredits).toBe(3);
  });

  it('skips courses with invalid grade', () => {
    const courses = [
      { name: 'Math', credits: 3, grade: 'X' },
      { name: 'English', credits: 3, grade: 'A' },
    ];
    const result = calculateGPA(courses);
    expect(result.gpa).toBe(4.0);
    expect(result.totalCredits).toBe(3);
  });

  it('handles all F grades', () => {
    const courses = [
      { name: 'Math', credits: 3, grade: 'F' },
      { name: 'English', credits: 3, grade: 'F' },
    ];
    const result = calculateGPA(courses);
    expect(result.gpa).toBe(0);
    expect(result.totalCredits).toBe(6);
    expect(result.totalQualityPoints).toBe(0);
  });

  it('uses custom scale when provided', () => {
    const customScale = { 'A': 5.0, 'B': 4.0, 'F': 0.0 };
    const courses = [
      { name: 'Math', credits: 3, grade: 'A' },
      { name: 'English', credits: 3, grade: 'B' },
    ];
    const result = calculateGPA(courses, customScale);
    // (3*5.0 + 3*4.0) / 6 = 27 / 6 = 4.5
    expect(result.gpa).toBe(4.5);
  });

  it('handles negative credits by skipping them', () => {
    const courses = [
      { name: 'Math', credits: -3, grade: 'A' },
      { name: 'English', credits: 3, grade: 'B' },
    ];
    const result = calculateGPA(courses);
    expect(result.gpa).toBe(3.0);
    expect(result.totalCredits).toBe(3);
  });
});

// ============================================================
// calculateSemesterGPA
// ============================================================

describe('calculateSemesterGPA', () => {
  it('calculates per-semester and cumulative GPA', () => {
    const semesters = [
      {
        name: 'Fall 2024',
        courses: [
          { name: 'Calculus', credits: 4, grade: 'A' },
          { name: 'English', credits: 3, grade: 'B' },
        ],
      },
      {
        name: 'Spring 2025',
        courses: [
          { name: 'Physics', credits: 4, grade: 'B+' },
          { name: 'History', credits: 3, grade: 'A-' },
        ],
      },
    ];
    const result = calculateSemesterGPA(semesters);

    expect(result.semesterGPAs).toHaveLength(2);
    expect(result.semesterGPAs[0].name).toBe('Fall 2024');
    expect(result.semesterGPAs[1].name).toBe('Spring 2025');
    expect(result.totalCredits).toBe(14);
    expect(result.cumulativeGPA).toBeGreaterThan(0);
  });

  it('returns empty for no semesters', () => {
    const result = calculateSemesterGPA([]);
    expect(result.semesterGPAs).toHaveLength(0);
    expect(result.cumulativeGPA).toBe(0);
    expect(result.totalCredits).toBe(0);
  });

  it('returns empty for null input', () => {
    const result = calculateSemesterGPA(null);
    expect(result.semesterGPAs).toHaveLength(0);
    expect(result.cumulativeGPA).toBe(0);
  });

  it('handles semester with empty courses', () => {
    const semesters = [
      { name: 'Fall 2024', courses: [] },
    ];
    const result = calculateSemesterGPA(semesters);
    expect(result.semesterGPAs[0].gpa).toBe(0);
    expect(result.cumulativeGPA).toBe(0);
    expect(result.totalCredits).toBe(0);
  });

  it('uses custom scale across all semesters', () => {
    const customScale = { 'A': 5.0, 'B': 4.0 };
    const semesters = [
      { name: 'S1', courses: [{ name: 'X', credits: 3, grade: 'A' }] },
      { name: 'S2', courses: [{ name: 'Y', credits: 3, grade: 'B' }] },
    ];
    const result = calculateSemesterGPA(semesters, customScale);
    expect(result.semesterGPAs[0].gpa).toBe(5.0);
    expect(result.semesterGPAs[1].gpa).toBe(4.0);
    // cumulative: (15 + 12) / 6 = 4.5
    expect(result.cumulativeGPA).toBe(4.5);
  });
});
