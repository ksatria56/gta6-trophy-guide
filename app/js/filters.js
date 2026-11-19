// Filtering for the checklist: text search, grade, kind, and the spoiler rule.
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

export function filterTrophies(trophies, state, query, grade, kind) {
  const q = query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (grade !== 'all' && t.grade !== grade) return false;
    if (kind === 'missable') {
      if (t.missable !== 'yes' && t.missable !== 'maybe') return false;
    } else if (kind !== 'all' && t.kind !== kind) return false;
    if (!q) return true;
    const hay = `${t.name} ${t.description} ${t.guide} ${KIND_LABELS[t.kind] ?? ''}`.toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
  });
}

export function countByGrade(trophies, state) {
  const out = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    out[t.grade][1] += 1;
    if (state.earned.includes(t.id)) out[t.grade][0] += 1;
  }
  return out;
}
