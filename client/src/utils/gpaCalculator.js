/**
 * GPA Calculator — Standard US 4.0 scale
 * Pure client-side, no server calls.
 */

export const GRADE_SCALE = {
  'A':  4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B':  3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C':  2.0,
  'C-': 1.7,
  'D+': 1.3,
  'D':  1.0,
  'F':  0.0,
};

/**
 * Calculate GPA from a list of courses.
 * @param {Array<{name: string, credits: number, grade: string}>} courses
 * @param {Record<string, number>} [customScale] - optional custom grade→point mapping
 * @returns {{ gpa: number, totalCredits: number, totalQualityPoints: number }}
 */
export function calculateGPA(courses, customScale) {
  const scale = customScale || GRADE_SCALE;

  if (!courses || courses.length === 0) {
    return { gpa: 0, totalCredits: 0, totalQualityPoints: 0 };
  }

  let totalCredits = 0;
  let totalQualityPoints = 0;

  for (const course of courses) {
    const credits = Number(course.credits) || 0;
    if (credits <= 0) continue;

    const gradePoints = scale[course.grade];
    if (gradePoints === undefined) continue;

    totalCredits += credits;
    totalQualityPoints += credits * gradePoints;
  }

  const gpa = totalCredits > 0
    ? Math.round((totalQualityPoints / totalCredits) * 100) / 100
    : 0;

  return {
    gpa,
    totalCredits,
    totalQualityPoints: Math.round(totalQualityPoints * 100) / 100,
  };
}

/**
 * Calculate per-semester and cumulative GPA.
 * @param {Array<{name: string, courses: Array}>} semesters
 * @param {Record<string, number>} [customScale]
 * @returns {{ semesterGPAs: Array<{name: string, gpa: number}>, cumulativeGPA: number, totalCredits: number }}
 */
export function calculateSemesterGPA(semesters, customScale) {
  if (!semesters || semesters.length === 0) {
    return { semesterGPAs: [], cumulativeGPA: 0, totalCredits: 0 };
  }

  const semesterGPAs = [];
  let cumulativeCredits = 0;
  let cumulativeQualityPoints = 0;

  for (const semester of semesters) {
    const result = calculateGPA(semester.courses, customScale);
    semesterGPAs.push({ name: semester.name, gpa: result.gpa });
    cumulativeCredits += result.totalCredits;
    cumulativeQualityPoints += result.totalQualityPoints;
  }

  const cumulativeGPA = cumulativeCredits > 0
    ? Math.round((cumulativeQualityPoints / cumulativeCredits) * 100) / 100
    : 0;

  return {
    semesterGPAs,
    cumulativeGPA,
    totalCredits: cumulativeCredits,
  };
}
