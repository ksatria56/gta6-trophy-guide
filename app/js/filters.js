// Filtering for the checklist: text search, grade, kind, the spoiler rule, and
// an unearned-only switch for players who only want what is left to chase.
// The spoiler rule hides the names and descriptions of story trophies until
// they are earned; everything else stays visible.
export const KIND_LABELS = {
  story: 'Story',
  stranger: 'Strangers',
  activity: 'Activities',
  collectible: 'Collectibles',
  crime: 'Crime',
  world: 'World',
  money: 'Money',
  choice: 'Choices',
  meta: 'Platinum path',
};

export function spoilerHidden(trophy, state) {
  return state.spoiler && trophy.kind === 'story' && !state.earned.includes(trophy.id);
}

export function filterTrophies(trophies, state, query, grade, kind, onlyUnearned = false) {
  const q = query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (onlyUnearned && state.earned.includes(t.id)) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (kind === 'missable') {
      if (t.missable !== 'yes' && t.missable !== 'maybe') return false;
    } else if (kind !== 'all' && t.kind !== kind) return false;
    if (!q) return true;
    const hay = `${t.name} ${t.description} ${t.guide} ${KIND_LABELS[t.kind] ?? ''}`.toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
  });
}

// How many trophies are still unearned: the "left to chase" count the toolbar
// and the planner show next to the filtered total.
export function countUnearned(trophies, state) {
  return trophies.filter((t) => !state.earned.includes(t.id)).length;
}

// The missables still to earn: the planner's warning line counts these, so a
// player sees at a glance how many moments-that-can-pass are left.
export function unearnedMissables(trophies, state) {
  return missableTrophiesList(trophies).filter((t) => !state.earned.includes(t.id));
}

function missableTrophiesList(trophies) {
  return trophies.filter((t) => t.missable === 'yes' || t.missable === 'maybe');
}

export function countByGrade(trophies, state) {
  const out = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    out[t.grade][1] += 1;
    if (state.earned.includes(t.id)) out[t.grade][0] += 1;
  }
  return out;
}

// --- Round 6: difficulty estimator ---
// A 1–5 effort score worked out from the trophy itself: its grade, whether
// its moment can pass, and how big its counter target is. It is an estimate
// for planning, not an official rarity — the game is not out yet.
export const GRADE_EFFORT = { platinum: 5, gold: 4, silver: 3, bronze: 1 };

export function estimateDifficulty(trophy, estimates) {
  const saved = estimates?.[trophy.id];
  if (saved && Number.isInteger(saved.e)) return Math.max(1, Math.min(5, saved.e));
  let score = GRADE_EFFORT[trophy.grade] ?? 1;
  if (trophy.missable === 'yes') score += 1;
  if (trophy.target && trophy.target.count >= 100) score += 1;
  else if (trophy.target && trophy.target.count >= 40) score += 1;
  return Math.max(1, Math.min(5, score));
}

export function difficultyLabel(score) {
  if (score <= 1) return 'Quick win';
  if (score === 2) return 'Easy';
  if (score === 3) return 'Steady';
  if (score === 4) return 'Tough';
  return 'Marathon';
}

export function difficultyStars(score) {
  return '★'.repeat(score) + '☆'.repeat(5 - score);
}

export function quickWins(trophies, state, estimates) {
  return trophies
    .filter((t) => !state.earned.includes(t.id))
    .map((t) => ({ trophy: t, score: estimateDifficulty(t, estimates) }))
    .filter((row) => row.score <= 2)
    .sort((a, b) => a.score - b.score || a.trophy.id - b.trophy.id)
    .map((row) => row.trophy);
}

// --- Round 6 (part 2): progress by Leonida region ---
// A trophy's region comes from the estimates table; the story lives in Vice
// City, the strangers out in the Keys, and so on. Regions with no trophies
// simply never appear, so the table stays the only place that defines them.
export function regionOf(trophy, estimates) {
  return estimates?.[trophy.id]?.r ?? 'Leonida';
}

export function regionProgress(trophies, state, estimates) {
  const rows = new Map();
  for (const trophy of trophies) {
    const region = regionOf(trophy, estimates);
    if (!rows.has(region)) rows.set(region, { region, done: 0, total: 0 });
    const row = rows.get(region);
    row.total += 1;
    if (state.earned.includes(trophy.id)) row.done += 1;
  }
  return [...rows.values()].sort((a, b) => b.total - a.total || a.region.localeCompare(b.region));
}

export function regionHours(trophies, state, estimates) {
  const rows = new Map();
  for (const trophy of trophies) {
    const region = regionOf(trophy, estimates);
    const hours = estimates?.[trophy.id]?.h ?? 0;
    if (!rows.has(region)) rows.set(region, { region, remaining: 0 });
    if (!state.earned.includes(trophy.id)) rows.get(region).remaining += hours;
  }
  return rows;
}

export function filterByDifficulty(trophies, state, estimates, maxScore) {
  return trophies.filter(
    (t) => !state.earned.includes(t.id) && estimateDifficulty(t, estimates) <= maxScore,
  );
}

export function hardestLeft(trophies, state, estimates) {
  return trophies
    .filter((t) => !state.earned.includes(t.id))
    .map((t) => ({ trophy: t, score: estimateDifficulty(t, estimates) }))
    .sort((a, b) => b.score - a.score || a.trophy.id - b.trophy.id)
    .slice(0, 5)
    .map((row) => row.trophy);
}
