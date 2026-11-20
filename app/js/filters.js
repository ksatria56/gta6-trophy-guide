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
