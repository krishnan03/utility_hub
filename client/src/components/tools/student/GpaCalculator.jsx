import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateGPA, GRADE_SCALE } from '../../../utils/gpaCalculator';

const GRADES = Object.keys(GRADE_SCALE);

function makeCourse(index) {
  return { id: Date.now() + index, name: '', credits: 3, grade: 'A' };
}

export default function GpaCalculator() {
  const [courses, setCourses] = useState([makeCourse(0)]);

  const result = useMemo(() => calculateGPA(courses), [courses]);

  const updateCourse = useCallback((id, field, value) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  }, []);

  const addCourse = useCallback(() => {
    setCourses((prev) => [...prev, makeCourse(prev.length)]);
  }, []);

  const removeCourse = useCallback((id) => {
    setCourses((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));
  }, []);

  const reset = useCallback(() => {
    setCourses([makeCourse(0)]);
  }, []);

  const gpaColor =
    result.gpa >= 3.5
      ? 'text-emerald-500'
      : result.gpa >= 2.5
        ? 'text-yellow-500'
        : result.gpa >= 1.0
          ? 'text-orange-500'
          : 'text-red-500';

  return (
    <div className="space-y-6">
      {/* GPA display */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-surface-400 mb-1">
            Cumulative GPA
          </p>
          <p className={`text-5xl font-extrabold font-mono ${gpaColor}`}>
            {result.gpa.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <p className="text-xs text-surface-400">Credits</p>
            <p className="text-lg font-bold font-mono text-surface-100">
              {result.totalCredits}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-400">Quality Pts</p>
            <p className="text-lg font-bold font-mono text-surface-100">
              {result.totalQualityPoints}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Course list */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {courses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {/* Course name */}
                <input
                  type="text"
                  placeholder={`Course ${index + 1}`}
                  value={course.name}
                  onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm text-surface-100 placeholder:text-surface-400 min-h-[44px]"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  aria-label={`Course ${index + 1} name`}
                />

                {/* Credits */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-surface-400 whitespace-nowrap">
                    Credits
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={course.credits}
                    onChange={(e) =>
                      updateCourse(course.id, 'credits', Number(e.target.value))
                    }
                    className="w-20 px-3 py-2.5 rounded-xl text-sm font-mono text-center text-surface-100 min-h-[44px]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                    aria-label={`Course ${index + 1} credits`}
                  />
                </div>

                {/* Grade */}
                <select
                  value={course.grade}
                  onChange={(e) => updateCourse(course.id, 'grade', e.target.value)}
                  className="px-3 py-2.5 rounded-xl text-sm font-mono text-surface-100 min-h-[44px]"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  aria-label={`Course ${index + 1} grade`}
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g} ({GRADE_SCALE[g].toFixed(1)})
                    </option>
                  ))}
                </select>

                {/* Remove */}
                <motion.button
                  type="button"
                  onClick={() => removeCourse(course.id)}
                  whileTap={{ scale: 0.9 }}
                  disabled={courses.length <= 1}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-surface-400 hover:text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label={`Remove course ${index + 1}`}
                >
                  ✕
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={addCourse}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex-1 min-h-[52px] px-6 py-3.5 rounded-2xl text-base font-bold bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl transition-all duration-200"
        >
          + Add Course
        </motion.button>
        <motion.button
          type="button"
          onClick={reset}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="min-h-[52px] px-6 py-3.5 rounded-2xl text-base font-bold text-surface-300 hover:bg-white/5 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Reset
        </motion.button>
      </div>
    </div>
  );
}
