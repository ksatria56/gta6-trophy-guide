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
  if (at === -1) state.earned.push(id);
  else state.earned.splice(at, 1);
  saveState(state);
  return state;
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
