// The roadmap to the platinum and the missables list, both built from the
// official descriptions: which story chapters and missions, which collectibles
// and counts, in what order. Nothing here claims a place the descriptions
// never pin down.
export const ROADMAP_STAGES = [
  {
    id: 'story',
    title: '1 · The story',
    blurb: 'Play Chapters 1–4 and the finale, and take the named missions as they come. Do the two partner trophies before the final mission.',
    ids: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 33, 34, 7],
  },
  {
    id: 'strangers',
    title: '2 · Strangers across Leonida',
    blurb: 'Eight stranger strands earn the silver. Finish Andy, Kenton, Billy, Randy and Tyrone too — each one ends in its own trophy.',
    ids: [22, 23, 24, 26, 27, 25, 29],
  },
  {
    id: 'activities',
    title: '3 · Activities',
    blurb: 'The long counts live here: 250 stunts, 42 gold shooting-range challenges, 20 race wins, 50 challenges. Chip at them between story beats.',
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
