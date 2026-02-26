/**
 * Pomodoro Timer — State Machine Logic
 * Pure client-side — no server calls, no UI.
 */

/**
 * Create a Pomodoro timer state machine.
 * @param {object} [config]
 * @param {number} [config.workDuration=25]       - Work phase in minutes
 * @param {number} [config.shortBreak=5]           - Short break in minutes
 * @param {number} [config.longBreak=15]           - Long break in minutes
 * @param {number} [config.longBreakInterval=4]    - Sessions before a long break
 * @param {function} [config.onTick]               - Called every second with state
 * @param {function} [config.onPhaseComplete]       - Called when a phase ends
 * @returns {object} Timer API: start(), pause(), resume(), reset(), getState()
 */
export function createTimer(config = {}) {
  const {
    workDuration = 25,
    shortBreak = 5,
    longBreak = 15,
    longBreakInterval = 4,
    onTick = null,
    onPhaseComplete = null,
  } = config;

  let phase = 'idle';           // 'idle' | 'work' | 'shortBreak' | 'longBreak'
  let remaining = 0;            // seconds
  let sessionsCompleted = 0;
  let isRunning = false;
  let intervalId = null;

  function getState() {
    return {
      phase,
      remaining,
      sessionsCompleted,
      isRunning,
    };
  }

  function tick() {
    if (remaining <= 0) {
      completePhase();
      return;
    }
    remaining -= 1;
    if (onTick) onTick(getState());
    if (remaining <= 0) {
      completePhase();
    }
  }

  function completePhase() {
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;

    const completedPhase = phase;

    if (phase === 'work') {
      sessionsCompleted += 1;
      if (onPhaseComplete) onPhaseComplete(completedPhase);

      // Decide next break type
      if (sessionsCompleted % longBreakInterval === 0) {
        phase = 'longBreak';
        remaining = longBreak * 60;
      } else {
        phase = 'shortBreak';
        remaining = shortBreak * 60;
      }
    } else {
      // Break completed → start next work session
      if (onPhaseComplete) onPhaseComplete(completedPhase);
      phase = 'work';
      remaining = workDuration * 60;
    }

    // Auto-start next phase
    startInterval();
  }

  function startInterval() {
    isRunning = true;
    if (onTick) onTick(getState());
    intervalId = setInterval(tick, 1000);
  }

  function start() {
    if (phase !== 'idle') return;
    phase = 'work';
    remaining = workDuration * 60;
    sessionsCompleted = 0;
    startInterval();
  }

  function pause() {
    if (!isRunning) return;
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
  }

  function resume() {
    if (isRunning || phase === 'idle') return;
    startInterval();
  }

  function reset() {
    clearInterval(intervalId);
    intervalId = null;
    phase = 'idle';
    remaining = 0;
    sessionsCompleted = 0;
    isRunning = false;
  }

  return { start, pause, resume, reset, getState };
}
