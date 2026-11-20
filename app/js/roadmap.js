// The roadmap to the platinum and the missables list, both built from the
// official descriptions: which story chapters and missions, which collectibles
// and counts, in what order. Nothing here claims a place the descriptions
// never pin down.
export const ROADMAP_STAGES = [
  {
    id: 'story',
    title: '1 · The story',
    blurb: 'Play Chapters 1–4 and the finale, and take the named missions as they come. Do the two partner trophies before the final mission.',
    tip: 'Save before the final mission and do the partner trophies first — a manual save is the only way back if the finale locks them out.',
    ids: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 33, 34, 7],
  },
  {
    id: 'strangers',
    title: '2 · Strangers across Leonida',
    blurb: 'Eight stranger strands earn the silver. Finish Andy, Kenton, Billy, Randy and Tyrone too — each one ends in its own trophy.',
    tip: 'Stranger strands open up as the story moves — check back after each chapter, since a strand only appears once its chapter has begun.',
    ids: [22, 23, 24, 26, 27, 25, 29],
  },
  {
    id: 'activities',
    title: '3 · Activities',
    blurb: 'The long counts live here: 250 stunts, 42 gold shooting-range challenges, 20 race wins, 50 challenges. Chip at them between story beats.',
    tip: 'The long counts reward steady play: a few stunts or one race win between story missions keeps the grind from piling up at the end.',
    ids: [16, 21, 20, 28, 46, 51, 18, 19, 17, 15, 32],
  },
  {
    id: 'collectibles',
    title: '4 · Collectibles',
    blurb: 'Cards, WAiNK spots, vehicles, garages and Scooter Bros registrations — all of them stay where they are, so take them at your own pace.',
    ids: [30, 31, 35, 54, 55],
  },
  {
    id: 'crime',
    title: '5 · Crime & money',
    blurb: 'Vaults, trucks, jewelry stores, gang operations — and the money to launder and spend. The Rhino and the VCIA departure fit here too.',
    ids: [36, 39, 41, 43, 37, 38, 40, 52, 53],
  },
  {
    id: 'world',
    title: '6 · The world & the strange',
    blurb: 'Explore every corner of Leonida, have a cocktail on Ocean Beach, drive out of a showroom — and keep an eye out for the strange event.',
    ids: [42, 44, 45, 47, 48, 49, 50],
  },
  {
    id: 'platinum',
    title: '7 · 100% & the platinum',
    blurb: 'When every stage above is done, 100% completion and the platinum pop together.',
    ids: [14, 1],
  },
];

export function stageProgress(stage, trophiesById, state) {
  const total = stage.ids.length;
  const done = stage.ids.filter((id) => state.earned.includes(id)).length;
  return { done, total };
}

export function missableTrophies(trophies) {
  return trophies.filter((t) => t.missable === 'yes' || t.missable === 'maybe');
}

export function nextUpQueue(trophies, state) {
  const order = [];
  for (const stage of ROADMAP_STAGES) {
    for (const id of stage.ids) {
      if (!order.includes(id)) order.push(id);
    }
  }
  return order
    .map((id) => trophies.find((t) => t.id === id))
    .filter((t) => t && !state.earned.includes(t.id));
}

// --- Round 6: platinum-time model ---
// Each trophy carries an estimated hours figure in the data file; the stages
// and the whole list add up from those figures, so the calculator never has
// to guess a trophy's length twice.
export function hoursFor(trophy, estimates) {
  const saved = estimates?.[trophy.id];
  return saved && typeof saved.h === 'number' && saved.h >= 0 ? saved.h : 0;
}

export function stageHours(stage, trophiesById, state, estimates) {
  let done = 0;
  let remaining = 0;
  for (const id of stage.ids) {
    const trophy = trophiesById.get(id);
    if (!trophy) continue;
    if (state.earned.includes(id)) done += hoursFor(trophy, estimates);
    else remaining += hoursFor(trophy, estimates);
  }
  return { done, remaining, total: done + remaining };
}

export function platinumTimeEstimate(trophies, state, estimates) {
  let earnedHours = 0;
  let remainingHours = 0;
  for (const trophy of trophies) {
    if (state.earned.includes(trophy.id)) earnedHours += hoursFor(trophy, estimates);
    else remainingHours += hoursFor(trophy, estimates);
  }
  const totalHours = earnedHours + remainingHours;
  return {
    earnedHours,
    remainingHours,
    totalHours,
    percent: totalHours ? Math.round((earnedHours / totalHours) * 100) : 0,
  };
}

export function weeksAtPace(remainingHours, hoursPerWeek) {
  if (!remainingHours) return 0;
  const pace = hoursPerWeek > 0 ? hoursPerWeek : 6;
  return Math.max(1, Math.ceil(remainingHours / pace));
}

// --- Round 6 (part 2): roadmap timeline ---
// Lay the stages out week by week at the player's pace: each stage starts
// the week after the previous one ends, so the timeline is just the stage
// hours divided by the pace, stacked in roadmap order.
export const PACE_OPTIONS = [
  { id: 'casual', label: 'Casual', hours: 3 },
  { id: 'steady', label: 'Steady', hours: 6 },
  { id: 'hardcore', label: 'Hardcore', hours: 12 },
];

export function finishDate(weeks, from) {
  const start = from ? new Date(from) : new Date();
  const end = new Date(start.getTime() + Math.max(0, weeks) * 7 * 86400000);
  return end.toISOString().slice(0, 10);
}

export function roadmapTimeline(trophies, state, estimates, hoursPerWeek) {
  const byId = new Map(trophies.map((t) => [t.id, t]));
  const pace = hoursPerWeek > 0 ? hoursPerWeek : 6;
  let week = 1;
  const rows = [];
  for (const stage of ROADMAP_STAGES) {
    const hours = stageHours(stage, byId, state, estimates);
    const stageWeeks = hours.remaining ? Math.max(1, Math.ceil(hours.remaining / pace)) : 0;
    rows.push({
      id: stage.id,
      title: stage.title,
      remainingHours: hours.remaining,
      totalHours: hours.total,
      startWeek: stageWeeks ? week : null,
      endWeek: stageWeeks ? week + stageWeeks - 1 : null,
    });
    week += stageWeeks;
  }
  return { rows, totalWeeks: Math.max(0, week - 1), finish: finishDate(Math.max(0, week - 1)) };
}
