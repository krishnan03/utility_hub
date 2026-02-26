import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTimer } from './pomodoroTimer.js';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

// ============================================================
// Initial state
// ============================================================

describe('createTimer — initial state', () => {
  it('starts in idle phase with zero remaining', () => {
    const timer = createTimer();
    const state = timer.getState();
    expect(state.phase).toBe('idle');
    expect(state.remaining).toBe(0);
    expect(state.sessionsCompleted).toBe(0);
    expect(state.isRunning).toBe(false);
  });
});

// ============================================================
// start / pause / resume
// ============================================================

describe('createTimer — start, pause, resume', () => {
  it('transitions to work phase on start', () => {
    const timer = createTimer({ workDuration: 25 });
    timer.start();
    const state = timer.getState();
    expect(state.phase).toBe('work');
    expect(state.remaining).toBe(25 * 60);
    expect(state.isRunning).toBe(true);
  });

  it('decrements remaining each second', () => {
    const timer = createTimer({ workDuration: 1 }); // 1 min
    timer.start();
    vi.advanceTimersByTime(3000); // 3 seconds
    expect(timer.getState().remaining).toBe(57);
  });

  it('pauses the timer', () => {
    const timer = createTimer({ workDuration: 1 });
    timer.start();
    vi.advanceTimersByTime(5000);
    timer.pause();
    const remaining = timer.getState().remaining;
    expect(timer.getState().isRunning).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(timer.getState().remaining).toBe(remaining); // unchanged
  });

  it('resumes the timer after pause', () => {
    const timer = createTimer({ workDuration: 1 });
    timer.start();
    vi.advanceTimersByTime(5000);
    timer.pause();
    const afterPause = timer.getState().remaining;
    timer.resume();
    expect(timer.getState().isRunning).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(timer.getState().remaining).toBe(afterPause - 3);
  });

  it('resume does nothing when idle', () => {
    const timer = createTimer();
    timer.resume();
    expect(timer.getState().phase).toBe('idle');
  });
});

// ============================================================
// Phase transitions
// ============================================================

describe('createTimer — phase transitions', () => {
  it('transitions from work to shortBreak after work completes', () => {
    const onPhaseComplete = vi.fn();
    const timer = createTimer({ workDuration: 1, shortBreak: 5, onPhaseComplete });
    timer.start();
    vi.advanceTimersByTime(60 * 1000); // complete 1 min work
    expect(onPhaseComplete).toHaveBeenCalledWith('work');
    expect(timer.getState().phase).toBe('shortBreak');
    expect(timer.getState().remaining).toBe(5 * 60);
    expect(timer.getState().sessionsCompleted).toBe(1);
  });

  it('transitions from shortBreak back to work', () => {
    const onPhaseComplete = vi.fn();
    const timer = createTimer({ workDuration: 1, shortBreak: 1, onPhaseComplete });
    timer.start();
    // Complete work (1 min)
    vi.advanceTimersByTime(60 * 1000);
    // Complete short break (1 min)
    vi.advanceTimersByTime(60 * 1000);
    expect(onPhaseComplete).toHaveBeenCalledWith('shortBreak');
    expect(timer.getState().phase).toBe('work');
  });
});

// ============================================================
// Long break after N sessions
// ============================================================

describe('createTimer — long break interval', () => {
  it('triggers long break after 4 work sessions', () => {
    const onPhaseComplete = vi.fn();
    const timer = createTimer({
      workDuration: 1,
      shortBreak: 1,
      longBreak: 2,
      longBreakInterval: 4,
      onPhaseComplete,
    });
    timer.start();

    // Complete 3 work + 3 short break cycles (sessions 1-3)
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(60 * 1000); // work
      vi.advanceTimersByTime(60 * 1000); // short break
    }
    expect(timer.getState().sessionsCompleted).toBe(3);

    // Complete 4th work session → should trigger long break
    vi.advanceTimersByTime(60 * 1000);
    expect(timer.getState().sessionsCompleted).toBe(4);
    expect(timer.getState().phase).toBe('longBreak');
    expect(timer.getState().remaining).toBe(2 * 60);
  });
});

// ============================================================
// Session counting
// ============================================================

describe('createTimer — session counting', () => {
  it('increments sessionsCompleted after each work phase', () => {
    const timer = createTimer({ workDuration: 1, shortBreak: 1 });
    timer.start();
    vi.advanceTimersByTime(60 * 1000); // work 1
    expect(timer.getState().sessionsCompleted).toBe(1);
    vi.advanceTimersByTime(60 * 1000); // short break
    vi.advanceTimersByTime(60 * 1000); // work 2
    expect(timer.getState().sessionsCompleted).toBe(2);
  });
});

// ============================================================
// Reset
// ============================================================

describe('createTimer — reset', () => {
  it('resets to idle state', () => {
    const timer = createTimer({ workDuration: 1 });
    timer.start();
    vi.advanceTimersByTime(10000);
    timer.reset();
    const state = timer.getState();
    expect(state.phase).toBe('idle');
    expect(state.remaining).toBe(0);
    expect(state.sessionsCompleted).toBe(0);
    expect(state.isRunning).toBe(false);
  });
});

// ============================================================
// Callbacks
// ============================================================

describe('createTimer — callbacks', () => {
  it('calls onTick every second', () => {
    const onTick = vi.fn();
    const timer = createTimer({ workDuration: 1, onTick });
    timer.start();
    vi.advanceTimersByTime(3000);
    // onTick called on start + 3 ticks
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(onTick).toHaveBeenCalledWith(expect.objectContaining({ phase: 'work' }));
  });
});
