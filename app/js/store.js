// Saved progress for Leonida Ledger: earned ticks, target counters and notes,
// all in one localStorage key, exportable to a file and importable back.
const STORE_KEY = 'leonida-ledger-v1';

export function blankState() {
  return { earned: [], counters: {}, notes: {}, spoiler: false, theme: 'paper' };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    return { ...blankState(), ...parsed };
  } catch {
    return blankState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export function isEarned(state, id) {
  return state.earned.includes(id);
}

export function toggleEarned(state, id) {
  const at = state.earned.indexOf(id);
  if (at === -1) {
    state.earned.push(id);
    recordEarned(state, id);
  } else {
    state.earned.splice(at, 1);
    recordUnearned(state, id);
  }
  saveState(state);
  return state;
}

// Clear one trophy's progress only: its tick, its counter and its note go,
// everything else in the save stays untouched.
export function resetOneTrophy(state, id) {
  state.earned = state.earned.filter((x) => x !== id);
  delete state.counters[id];
  delete state.notes[id];
  saveState(state);
  return state;
}

// Progress as a whole percent of the list: the planner's headline number,
// rounded so 27 of 55 reads as 49% rather than a long decimal.
export function progressPercent(state, total) {
  if (!total) return 0;
  return Math.round((state.earned.length / total) * 100);
}

// How many trophies are earned: the save page reads this instead of reaching
// into the state's earned list itself.
export function countEarned(state) {
  return state.earned.length;
}

export function readCounter(state, id) {
  return state.counters[id] ?? 0;
}

export function bumpCounter(state, id, delta, target) {
  const next = Math.max(0, Math.min(target ?? Infinity, readCounter(state, id) + delta));
  state.counters[id] = next;
  if (target && next >= target && !isEarned(state, id)) state.earned.push(id);
  if (target && next < target && isEarned(state, id)) {
    // Un-earning by lowering the counter only when the user lowers it by hand.
    state.earned = state.earned.filter((x) => x !== id);
  }
  saveState(state);
  return next;
}

export function readNote(state, id) {
  return state.notes[id] ?? '';
}

export function writeNote(state, id, text) {
  if (text.trim()) state.notes[id] = text;
  else delete state.notes[id];
  saveState(state);
}

export function exportProgress(state) {
  return JSON.stringify({ app: 'leonida-ledger', version: 1, state }, null, 2);
}

export function importProgress(text) {
  const parsed = JSON.parse(text);
  const state = parsed.state ?? parsed;
  if (!Array.isArray(state.earned)) throw new Error('not a Leonida Ledger progress file');
  return { ...blankState(), ...state };
}

// --- Round 6: earned-date log, weekly goal and streak ---
// Every earned tick is stamped with the day it happened, so the guide can
// show a streak and a weekly goal without asking the player to keep a diary.
// The log is capped so a years-old save stays small.
export function earnLog(state) {
  if (!Array.isArray(state.earnLog)) state.earnLog = [];
  return state.earnLog;
}

export function recordEarned(state, id, day) {
  const stamp = day ?? new Date().toISOString().slice(0, 10);
  const log = earnLog(state);
  if (!log.some((entry) => entry.id === id && entry.day === stamp)) {
    log.push({ id, day: stamp });
    if (log.length > 400) log.splice(0, log.length - 400);
  }
  saveState(state);
}

export function recordUnearned(state, id) {
  state.earnLog = earnLog(state).filter((entry) => entry.id !== id);
  saveState(state);
}

export function weeklyGoal(state) {
  const goal = Number(state.weeklyGoal);
  return Number.isInteger(goal) && goal > 0 && goal <= 55 ? goal : 3;
}

export function setWeeklyGoal(state, goal) {
  const next = Math.max(1, Math.min(55, Math.round(Number(goal) || 3)));
  state.weeklyGoal = next;
  saveState(state);
  return next;
}

export function earnedOnDay(state, day) {
  return earnLog(state).filter((entry) => entry.day === day).length;
}

// --- Round 6 (part 2): streak and weekly pace ---
// A streak is consecutive days with at least one earned trophy, counted back
// from today (or yesterday, so a streak does not die before breakfast). The
// week count is the last seven days including today.
function dayOffset(today, back) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}

export function earnedThisWeek(state, today) {
  const now = today ?? new Date().toISOString().slice(0, 10);
  let count = 0;
  for (let back = 0; back < 7; back++) count += earnedOnDay(state, dayOffset(now, back));
  return count;
}

export function streakDays(state, today) {
  const now = today ?? new Date().toISOString().slice(0, 10);
  let start = 0;
  if (!earnedOnDay(state, now)) start = 1;
  let streak = 0;
  for (let back = start; ; back++) {
    if (!earnedOnDay(state, dayOffset(now, back))) break;
    streak += 1;
  }
  return streak;
}

export function longestStreak(state) {
  const days = [...new Set(earnLog(state).map((entry) => entry.day))].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of days) {
    const gap = prev ? (new Date(`${day}T00:00:00Z`) - new Date(`${prev}T00:00:00Z`)) / 86400000 : 2;
    run = gap === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

export function weekCalendar(state, today) {
  const now = today ?? new Date().toISOString().slice(0, 10);
  const days = [];
  for (let back = 13; back >= 0; back--) {
    const day = dayOffset(now, back);
    days.push({ day, count: earnedOnDay(state, day) });
  }
  return days;
}
