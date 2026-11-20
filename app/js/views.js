// Views for Leonida Ledger: the checklist, the trophy guide pane, the roadmap,
// the missables page, the Next-up planner and the save page.
import { KIND_LABELS, countByGrade, difficultyLabel, difficultyStars, estimateDifficulty, filterTrophies, quickWins, regionHours, regionProgress, spoilerHidden, unearnedMissables } from './filters.js';
import { PACE_OPTIONS, ROADMAP_STAGES, finishDate, hoursFor, missableTrophies, nextUpQueue, platinumTimeEstimate, roadmapTimeline, stageHours, stageProgress, weeksAtPace } from './roadmap.js';
import { bumpCounter, countEarned, earnedThisWeek, isEarned, longestStreak, progressPercent, readCounter, readNote, resetOneTrophy, setWeeklyGoal, streakDays, toggleEarned, weekCalendar, weeklyGoal, writeNote } from './store.js';

const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

// The random picker remembers its last choice, so "Pick another" never hands
// back the same trophy twice in a row while there is anything else to chase.
// The picker's short memory: the last three picks, shown under the new card
// so a player can retrace what Leonida already suggested this session.
const pickHistory = [];
let lastPickId = null;

function pickFrom(pool) {
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];
  let choice = pool[Math.floor(Math.random() * pool.length)];
  if (choice.id === lastPickId) {
    choice = pool[(pool.indexOf(choice) + 1) % pool.length];
  }
  return choice;
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function medalDot(grade) {
  return el('span', `medal ${grade}`);
}

function trophyLink(trophy) {
  const a = el('a', null, trophy.name);
  a.href = `#/trophy/${trophy.id}`;
  return a;
}

export function renderProgress(trophies, state) {
  const earned = state.earned.length;
  document.getElementById('progressCount').textContent = `${earned} of ${trophies.length} earned`;
  document.getElementById('progressFill').style.width = `${(earned / trophies.length) * 100}%`;
  const byGrade = countByGrade(trophies, state);
  document.getElementById('progressByGrade').textContent = GRADE_ORDER.map(
    (g) => `${g}: ${byGrade[g][0]}/${byGrade[g][1]}`,
  ).join(' · ');
}

export function renderChecklist(view, trophies, state, controls) {
  view.replaceChildren();
  const head = el('h2', null, 'The checklist');
  const lede = el('p', 'lede', 'All 55 official trophies. Tick one off when you earn it — progress is saved in this browser. Open a trophy for its full guide and its sources.');
  view.append(head, lede);
  const rows = filterTrophies(trophies, state, controls.query, controls.grade, controls.kind, controls.unearned);
  const pickBox = el('div', 'pickBox');
  const pickIntro = el('p', 'pickIntro', 'Can’t decide what to chase next? Let Leonida choose.');
  const pickBtn = el('button', null, 'Pick one for me');
  pickBtn.type = 'button';
  const pickResult = el('div', 'pickResult');
  pickBtn.addEventListener('click', () => {
    const pool = rows.filter((t) => !isEarned(state, t.id));
    pickResult.replaceChildren();
    if (!rows.length) {
      pickResult.append(el('p', 'empty', 'Nothing matches those filters — clear the search or pick another kind, then try again.'));
      return;
    }
    if (!pool.length) {
      pickResult.append(el('p', 'empty', 'Every trophy matching those filters is already earned. Widen the filters for a fresh pick.'));
      return;
    }
    const pick = pickFrom(pool);
    lastPickId = pick.id;
    pickHistory.unshift(pick);
    if (pickHistory.length > 3) pickHistory.pop();
    const card = el('article', 'pickCard');
    const hidden = spoilerHidden(pick, state);
    const name = el('p', 'trophyName', hidden ? 'Hidden story trophy' : pick.name);
    name.append(el('span', 'gradeTag', pick.grade));
    const desc = el('p', 'trophyDesc', hidden ? 'Earn it to reveal the description.' : pick.description);
    const meta = el('div', 'trophyMeta');
    meta.append(el('span', 'tag', KIND_LABELS[pick.kind] ?? pick.kind));
    if (pick.missable === 'yes') meta.append(el('span', 'tag missable', 'Missable'));
    if (pick.missable === 'maybe') meta.append(el('span', 'tag missable', 'Possibly missable'));
    if (pick.target) meta.append(el('span', 'tag target', `${readCounter(state, pick.id)} / ${pick.target.count} ${pick.target.label}`));
    const open = el('button', 'ghost', 'Open the guide →');
    open.type = 'button';
    open.addEventListener('click', () => { location.hash = `#/trophy/${pick.id}`; });
    const again = el('button', null, 'Pick another');
    again.type = 'button';
    again.addEventListener('click', () => pickBtn.click());
    const actions = el('div', 'pickActions');
    actions.append(open, again);
    const count = el('p', 'pickCount', `${pool.length} unearned ${pool.length === 1 ? 'trophy' : 'trophies'} match — start with this one:`);
    card.append(count, name, desc);
    if (pick.hint && !hidden) card.append(el('p', 'hint', `Hint: ${pick.hint}`));
    card.append(meta, actions);
    if (pickHistory.length > 1) {
      card.append(el('p', 'pickHistory', `Previously picked: ${pickHistory.slice(1).map((t) => spoilerHidden(t, state) ? 'Hidden story trophy' : t.name).join(' · ')}`));
    }
    pickResult.append(card);
  });
  // Forget the picker's short memory: clears the last-pick guard and the
  // history line, so the next pick starts fresh instead of avoiding a trophy
  // that was only picked because the filters were narrow.
  const forgetBtn = el('button', 'ghost', 'Forget previous picks');
  forgetBtn.type = 'button';
  forgetBtn.addEventListener('click', () => {
    pickHistory.length = 0;
    lastPickId = null;
    pickResult.replaceChildren();
  });
  pickBox.append(pickIntro, pickBtn, forgetBtn, pickResult);
  view.append(pickBox);
  const list = el('div', null);
  list.id = 'checklist';
  if (!rows.length) {
    list.append(el('p', 'empty', 'No trophies match those filters. Clear the search or pick another kind.'));
  }
  for (const t of rows) {
    const row = el('div', 'trophyRow' + (isEarned(state, t.id) ? ' earned' : ''));
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = isEarned(state, t.id);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('change', (event) => {
      event.stopPropagation();
      toggleEarned(state, t.id);
      renderChecklist(view, trophies, state, controls);
      renderProgress(trophies, state);
    });
    const name = el('p', 'trophyName', spoilerHidden(t, state) ? 'Hidden story trophy' : t.name);
    const gradeTag = el('span', 'gradeTag', t.grade);
    name.append(gradeTag);
    const desc = el('p', 'trophyDesc', spoilerHidden(t, state) ? 'Earn it to reveal the description.' : t.description);
    const meta = el('div', 'trophyMeta');
    meta.append(el('span', 'tag', KIND_LABELS[t.kind] ?? t.kind));
    if (t.missable === 'yes') meta.append(el('span', 'tag missable', 'Missable'));
    if (t.missable === 'maybe') meta.append(el('span', 'tag missable', 'Possibly missable'));
    if (t.target) meta.append(el('span', 'tag target', `${readCounter(state, t.id)} / ${t.target.count} ${t.target.label}`));
    if (controls.estimates) {
      const difficulty = estimateDifficulty(t, controls.estimates);
      meta.append(el('span', 'tag diffTag', `${difficultyStars(difficulty)} ${difficultyLabel(difficulty)}`));
    }
    const text = el('div', null);
    text.append(name, desc, meta);
    const open = el('button', 'ghost openBtn', 'Guide →');
    open.type = 'button';
    open.addEventListener('click', () => { location.hash = `#/trophy/${t.id}`; });
    row.append(box, medalDot(t.grade), text, open);
    row.addEventListener('click', (event) => {
      if (event.target === box) return;
      location.hash = `#/trophy/${t.id}`;
    });
    list.append(row);
  }
  view.append(list);
}

export function renderDetail(pane, body, trophies, sources, state, onClose) {
  const id = Number(location.hash.split('/')[2]);
  const t = trophies.find((x) => x.id === id);
  if (!t) { pane.hidden = true; return; }
  pane.hidden = false;
  body.replaceChildren();
  const title = el('h2', null, t.name);
  const gradeLine = el('p', 'official', `${t.grade} trophy · ${KIND_LABELS[t.kind] ?? t.kind}`);
  const official = el('p', 'official', `Official description: “${t.description}”`);
  const guideHead = el('h3', null, 'How to get it');
  const guide = el('p', null, t.guide);
  body.append(title, gradeLine, official, guideHead, guide);
  if (t.hint) body.append(el('p', 'hint', `Hint: ${t.hint}`));
  if (t.steps && t.steps.length) {
    body.append(el('h3', null, 'Steps'));
    const ol = el('ol', null);
    for (const step of t.steps) ol.append(el('li', null, step));
    body.append(ol);
  }
  if (t.target) {
    body.append(el('h3', null, 'Your counter'));
    const row = el('div', 'counterRow');
    const minus = el('button', 'ghost', '−');
    const plus = el('button', 'ghost', '+');
    const out = el('output', null, `${readCounter(state, t.id)} / ${t.target.count} ${t.target.label}`);
    minus.type = 'button'; plus.type = 'button';
    minus.addEventListener('click', () => {
      bumpCounter(state, t.id, -1, t.target.count);
      out.textContent = `${readCounter(state, t.id)} / ${t.target.count} ${t.target.label}`;
    });
    plus.addEventListener('click', () => {
      bumpCounter(state, t.id, 1, t.target.count);
      out.textContent = `${readCounter(state, t.id)} / ${t.target.count} ${t.target.label}`;
      if (isEarned(state, t.id)) out.textContent += ' — earned!';
    });
    row.append(minus, out, plus);
    body.append(row);
  }
  if (t.missable !== 'no') {
    body.append(el('h3', null, 'When it can be missed'));
    body.append(el('p', null, t.missable_note));
  }
  body.append(el('h3', null, 'Sources'));
  const ul = el('ul', 'sources');
  for (const key of t.src) {
    const src = sources[key];
    if (!src) continue;
    const li = el('li', null);
    if (src.url) {
      const a = el('a', null, src.name);
      a.href = src.url;
      a.target = '_blank';
      a.rel = 'noopener';
      li.append(a);
    } else {
      li.textContent = src.name;
    }
    ul.append(li);
  }
  body.append(ul);
  body.append(el('h3', null, 'Your note'));
  const note = document.createElement('textarea');
  note.className = 'noteBox';
  note.placeholder = 'Your own note for this trophy — where you found it, what worked…';
  note.value = readNote(state, t.id);
  note.addEventListener('change', () => writeNote(state, t.id, note.value));
  body.append(note);
  const earned = el('p', null, isEarned(state, t.id) ? '✓ Earned — ticked on your checklist.' : 'Not earned yet.');
  body.append(earned);
  const resetOne = el('button', 'ghost', 'Clear this trophy’s progress');
  resetOne.type = 'button';
  resetOne.addEventListener('click', () => {
    if (!window.confirm(`Clear the tick, counter and note for “${t.name}”?`)) return;
    resetOneTrophy(state, t.id);
    location.hash = '#/';
    location.reload();
  });
  body.append(resetOne);
  onClose();
}

export function renderRoadmap(view, trophies, state) {
  view.replaceChildren();
  view.append(el('h2', null, 'Roadmap to the platinum'));
  view.append(el('p', 'lede', 'Seven stages in order, built from the official descriptions: which story chapters and missions, which collectibles and counts. Finish a stage, move to the next — the platinum pops at the end of stage 7.'));
  const byId = new Map(trophies.map((t) => [t.id, t]));
  for (const stage of ROADMAP_STAGES) {
    const card = el('section', 'stage');
    const { done, total } = stageProgress(stage, byId, state);
    card.append(el('h3', null, `${stage.title} — ${done}/${total}`));
    card.append(el('p', null, stage.blurb));
    if (stage.tip) card.append(el('p', 'stageTip', stage.tip));
    const bar = el('div', 'stageBar');
    bar.append(el('div', null));
    bar.firstChild.style.width = `${(done / total) * 100}%`;
    card.append(bar);
    const list = el('div', 'stageList');
    for (const id of stage.ids) {
      const t = byId.get(id);
      if (!t) continue;
      const link = trophyLink(t);
      if (isEarned(state, id)) link.className = 'done';
      const line = el('p', null, `${isEarned(state, id) ? '✓' : '○'} `);
      line.append(link);
      if (t.missable === 'yes') line.append(el('span', 'tag missable', ' Missable'));
      list.append(line);
    }
    card.append(list);
    view.append(card);
  }
}

export function renderMissables(view, trophies, state) {
  view.replaceChildren();
  view.append(el('h2', null, 'Missable trophies'));
  view.append(el('p', 'lede', 'The trophies whose moment can pass — read from the official descriptions, not yet checked in the game. Do the “yes” ones before the finale; keep a manual save before the “maybe” ones. Everything else on the list can be earned any time.'));
  const callout = el('div', 'callout');
  callout.append(el('p', null, 'Rule of thumb: partner trophies go first. Hot Together and Retail Therapy need your partner beside you, and the finale may take that away.'));
  view.append(callout);
  for (const t of missableTrophies(trophies)) {
    const card = el('article', 'missCard' + (t.missable === 'maybe' ? ' maybe' : ''));
    const h = el('h3', null, `${t.name} — ${t.missable === 'yes' ? 'Missable' : 'Possibly missable'}`);
    card.append(h);
    card.append(el('p', null, t.description));
    card.append(el('p', null, t.missable_note));
    const link = trophyLink(t);
    const go = el('p', null, 'Read the guide: ');
    go.append(link);
    card.append(go);
    view.append(card);
  }
}

export function renderPlanner(view, trophies, state) {
  view.replaceChildren();
  view.append(el('h2', null, 'Next up'));
  view.append(el('p', 'lede', 'Your queue, in roadmap order — the next trophy to chase is at the top. Earned trophies drop off the list as you tick them.'));
  const queue = nextUpQueue(trophies, state);
  if (!queue.length) {
    view.append(el('p', 'empty', 'Everything is earned — the platinum is yours. Leonida Legend.'));
    return;
  }
  const list = el('div', 'stageList');
  queue.slice(0, 12).forEach((t, i) => {
    const line = el('p', null, `${i + 1}. `);
    line.append(trophyLink(t));
    line.append(el('span', 'tag', ` ${KIND_LABELS[t.kind] ?? t.kind}`));
    if (t.missable === 'yes') line.append(el('span', 'tag missable', ' Missable'));
    list.append(line);
  });
  view.append(list);
  view.append(el('p', 'plannerNote', `You are ${progressPercent(state, trophies.length)}% of the way to the platinum.`));
  const missLeft = unearnedMissables(trophies, state).length;
  view.append(el('p', 'plannerNote', `${missLeft} missable ${missLeft === 1 ? 'trophy' : 'trophies'} still to earn — do those before the finale.`));
  view.append(el('p', 'lede', `${queue.length} trophies left to earn.`));
}

export function renderSave(view, trophies, state) {
  view.replaceChildren();
  view.append(el('h2', null, 'Save & settings'));
  const earned = countEarned(state);
  view.append(el('p', 'lede', `You have earned ${earned} of ${trophies.length} trophies. Progress lives in this browser's local storage. Export it to a file before you clear the browser — import it back any time.`));
  const callout = el('div', 'callout');
  callout.append(el('p', null, 'Spoiler setting: with “Hide story spoilers” on, the names and descriptions of story trophies stay hidden until you earn them. Night theme swaps the paper look for a dark one. Both settings are saved with your progress.'));
  view.append(callout);
  const reset = el('button', 'ghost', 'Reset all progress');
  reset.type = 'button';
  reset.addEventListener('click', () => {
    if (!window.confirm('Reset every tick, counter and note?')) return;
    state.earned = [];
    state.counters = {};
    state.notes = {};
    location.hash = '#/';
    location.reload();
  });
  view.append(reset);
}

// --- Round 6: platinum-time calculator and next-trophy recommender ---
// The calculator adds up the per-trophy hour estimates from the data file;
// the recommender scores every unearned trophy in the open and shows why
// each one made the top five. Neither invents data — both read the same table.
let paceHours = 6;

export function setPaceHours(hours) {
  paceHours = hours > 0 ? hours : 6;
}

function paceButton(label, hours, rerender) {
  const button = el('button', paceHours === hours ? 'active' : null, label);
  button.type = 'button';
  button.addEventListener('click', () => {
    setPaceHours(hours);
    rerender();
  });
  return button;
}

export function renderTimeCalc(view, trophies, state, estimates) {
  view.replaceChildren();
  view.append(el('h2', null, 'How long to the platinum?'));
  view.append(el('p', 'lede', 'Every trophy carries an estimated hours figure in the guide data. Add them up, subtract what you have earned, and divide by the hours you play each week — that is your date with the platinum.'));
  const estimate = platinumTimeEstimate(trophies, state, estimates);
  const grid = el('div', 'timeGrid');
  const cards = [
    [`${estimate.totalHours} h`, 'estimated for the whole list'],
    [`${estimate.earnedHours} h`, 'banked on trophies you have earned'],
    [`${estimate.remainingHours} h`, 'still to go'],
    [`${estimate.percent}%`, 'of the hours behind you'],
  ];
  for (const [num, label] of cards) {
    const card = el('div', 'timeCard');
    card.append(el('p', 'timeNum', num));
    card.append(el('p', null, label));
    grid.append(card);
  }
  view.append(grid);
  const rerender = () => renderTimeCalc(view, trophies, state, estimates);
  const paceRow = el('div', 'paceRow');
  paceRow.append(el('p', null, 'Your pace:'));
  for (const pace of PACE_OPTIONS) {
    paceRow.append(paceButton(`${pace.label} — ${pace.hours} h/week`, pace.hours, rerender));
  }
  view.append(paceRow);
  const weeks = weeksAtPace(estimate.remainingHours, paceHours);
  const finish = finishDate(weeks);
  view.append(el('p', 'finishLine', weeks ? `At ${paceHours} hours a week, the platinum is about ${weeks} ${weeks === 1 ? 'week' : 'weeks'} away — around ${finish}.` : 'Nothing left — the platinum is yours.'));
  const byId = new Map(trophies.map((t) => [t.id, t]));
  for (const stage of ROADMAP_STAGES) {
    const hours = stageHours(stage, byId, state, estimates);
    if (!hours.total) continue;
    const row = el('div', 'stageHoursRow');
    row.append(el('p', null, `${stage.title}: ${hours.remaining} h left of ${hours.total} h`));
    const bar = el('div', 'regionBar');
    const fill = el('div', 'regionFill');
    fill.style.width = `${hours.total ? (hours.done / hours.total) * 100 : 0}%`;
    bar.append(fill);
    row.append(bar);
    view.append(row);
  }
}

function stageIndexOf(trophy) {
  for (let i = 0; i < ROADMAP_STAGES.length; i++) {
    if (ROADMAP_STAGES[i].ids.includes(trophy.id)) return i;
  }
  return ROADMAP_STAGES.length;
}

function recommendScore(trophy, state, estimates) {
  const reasons = [];
  let score = 0;
  if (trophy.missable === 'yes') { score += 40; reasons.push('Missable — its moment can pass'); }
  else if (trophy.missable === 'maybe') { score += 20; reasons.push('Possibly missable'); }
  const difficulty = estimateDifficulty(trophy, estimates);
  score += (5 - difficulty) * 8;
  if (difficulty <= 2) reasons.push(`${difficultyLabel(difficulty)} — a fast tick`);
  if (trophy.target) {
    const done = readCounter(state, trophy.id);
    const share = Math.min(1, done / trophy.target.count);
    score += Math.round(share * 15);
    if (share > 0) reasons.push(`${done} of ${trophy.target.count} ${trophy.target.label} already done`);
  }
  score += (ROADMAP_STAGES.length - stageIndexOf(trophy)) * 3;
  reasons.push(`Roadmap stage ${stageIndexOf(trophy) + 1}`);
  return { score, reasons, difficulty };
}

export function renderRecommender(view, trophies, state, estimates) {
  view.replaceChildren();
  view.append(el('h2', null, 'What should I chase next?'));
  view.append(el('p', 'lede', 'Five suggestions, scored in the open: missable trophies first, then quick wins, then whatever you have already half-finished, then the earliest roadmap stage. Nothing here is hidden — every suggestion shows its reasons.'));
  const scored = trophies
    .filter((t) => !isEarned(state, t.id) && t.grade !== 'platinum')
    .map((t) => ({ trophy: t, ...recommendScore(t, state, estimates) }))
    .sort((a, b) => b.score - a.score || a.trophy.id - b.trophy.id)
    .slice(0, 5);
  if (!scored.length) {
    view.append(el('p', 'empty', 'Nothing left to recommend — every trophy is earned.'));
    return;
  }
  for (const [i, row] of scored.entries()) {
    const card = el('article', 'recoCard');
    card.append(el('p', 'recoRank', `#${i + 1} — score ${row.score}`));
    const name = el('p', 'trophyName', row.trophy.name);
    name.append(el('span', 'gradeTag', row.trophy.grade));
    card.append(name);
    card.append(el('p', 'trophyDesc', row.trophy.description));
    card.append(el('p', 'recoDiff', `${difficultyStars(row.difficulty)} ${difficultyLabel(row.difficulty)} · about ${hoursFor(row.trophy, estimates)} h`));
    const reasons = el('ul', 'recoReasons');
    for (const reason of row.reasons) reasons.append(el('li', null, reason));
    card.append(reasons);
    const open = el('button', 'ghost', 'Open the guide →');
    open.type = 'button';
    open.addEventListener('click', () => { location.hash = `#/trophy/${row.trophy.id}`; });
    card.append(open);
    view.append(card);
  }
  const wins = quickWins(trophies, state, estimates).slice(0, 5);
  if (wins.length) {
    view.append(el('h3', null, 'Quick wins'));
    view.append(el('p', 'lede', wins.map((t) => t.name).join(' · ')));
  }
}

// --- Round 6 (part 2): regions, streak, timeline and markdown export ---
// Four more pages on the same estimates table and the same earned-date log:
// where the remaining work sits on the map, how the week is going, when each
// roadmap stage lands, and a checklist you can paste anywhere.
export function renderRegions(view, trophies, state, estimates, regionNotes) {
  view.replaceChildren();
  view.append(el('h2', null, 'Progress by region'));
  view.append(el('p', 'lede', 'One flat percent hides where the work is. These six corners of Leonida each have their own bar — clear the region you are standing in before you drive somewhere new.'));
  const hours = regionHours(trophies, state, estimates);
  for (const row of regionProgress(trophies, state, estimates)) {
    const card = el('section', 'regionRow');
    const left = hours.get(row.region)?.remaining ?? 0;
    card.append(el('h3', null, `${row.region} — ${row.done}/${row.total}`));
    if (regionNotes?.[row.region]) card.append(el('p', null, regionNotes[row.region]));
    card.append(el('p', null, `${left} estimated hours left here.`));
    const bar = el('div', 'regionBar');
    const fill = el('div', 'regionFill');
    fill.style.width = `${row.total ? (row.done / row.total) * 100 : 0}%`;
    bar.append(fill);
    card.append(bar);
    view.append(card);
  }
}

export function renderStreak(view, trophies, state) {
  view.replaceChildren();
  view.append(el('h2', null, 'Streak & weekly goal'));
  const streak = streakDays(state);
  const best = longestStreak(state);
  const week = earnedThisWeek(state);
  const goal = weeklyGoal(state);
  view.append(el('p', 'lede', `You are on a ${streak}-day streak (best: ${best} days) and have earned ${week} of your ${goal} trophies this week. Tick a trophy and the streak keeps itself — the log stamps the day for you.`));
  const goalRow = el('div', 'goalRow');
  goalRow.append(el('p', null, 'Trophies per week:'));
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.max = '55';
  input.value = String(goal);
  const save = el('button', null, 'Set goal');
  save.type = 'button';
  save.addEventListener('click', () => {
    setWeeklyGoal(state, input.value);
    renderStreak(view, trophies, state);
  });
  goalRow.append(input, save);
  view.append(goalRow);
  const bar = el('div', 'regionBar');
  const fill = el('div', 'regionFill');
  fill.style.width = `${Math.min(100, (week / goal) * 100)}%`;
  bar.append(fill);
  view.append(bar);
  view.append(el('p', 'finishLine', week >= goal ? 'Weekly goal met — Leonida approves.' : `${goal - week} more to hit this week's goal.`));
  const cal = el('div', 'streakCal');
  for (const day of weekCalendar(state)) {
    const cell = el('div', 'streakDay' + (day.count ? ' hit' : ''));
    cell.append(el('p', null, day.day.slice(5)));
    cell.append(el('p', null, day.count ? `${day.count} ✓` : '—'));
    cal.append(cell);
  }
  view.append(el('h3', null, 'Last 14 days'));
  view.append(cal);
}

export function renderTimeline(view, trophies, state, estimates) {
  view.replaceChildren();
  view.append(el('h2', null, 'Roadmap timeline'));
  view.append(el('p', 'lede', 'The seven roadmap stages laid out week by week at your pace. A stage with nothing left takes no weeks — it is already behind you.'));
  const rerender = () => renderTimeline(view, trophies, state, estimates);
  const paceRow = el('div', 'paceRow');
  paceRow.append(el('p', null, 'Your pace:'));
  for (const pace of PACE_OPTIONS) {
    paceRow.append(paceButton(`${pace.label} — ${pace.hours} h/week`, pace.hours, rerender));
  }
  view.append(paceRow);
  const plan = roadmapTimeline(trophies, state, estimates, paceHours);
  for (const row of plan.rows) {
    const line = el('div', 'timelineRow');
    const when = row.startWeek ? `Weeks ${row.startWeek}–${row.endWeek}` : 'Done';
    line.append(el('p', null, `${row.title} — ${when} · ${row.remainingHours} h left`));
    const bar = el('div', 'regionBar');
    const fill = el('div', 'regionFill');
    fill.style.width = `${plan.totalWeeks && row.startWeek ? ((row.endWeek - row.startWeek + 1) / plan.totalWeeks) * 100 : 0}%`;
    bar.append(fill);
    line.append(bar);
    view.append(line);
  }
  view.append(el('p', 'finishLine', plan.totalWeeks ? `Platinum around ${plan.finish} — ${plan.totalWeeks} weeks at ${paceHours} hours a week.` : 'Every stage is done — the platinum is yours.'));
}

function markdownChecklist(trophies, state, estimates) {
  const lines = ['# Leonida Ledger — GTA VI trophy checklist', ''];
  lines.push(`Progress: ${state.earned.length} of ${trophies.length} earned.`);
  lines.push('');
  for (const stage of ROADMAP_STAGES) {
    lines.push(`## ${stage.title}`);
    for (const id of stage.ids) {
      const trophy = trophies.find((t) => t.id === id);
      if (!trophy) continue;
      const tick = isEarned(state, id) ? 'x' : ' ';
      const difficulty = estimateDifficulty(trophy, estimates);
      lines.push(`- [${tick}] ${trophy.name} (${trophy.grade}, ${difficultyLabel(difficulty)}, about ${hoursFor(trophy, estimates)} h)`);
    }
    lines.push('');
  }
  const missing = trophies.filter((t) => !ROADMAP_STAGES.some((s) => s.ids.includes(t.id)));
  for (const trophy of missing) {
    const tick = isEarned(state, trophy.id) ? 'x' : ' ';
    lines.push(`- [${tick}] ${trophy.name} (${trophy.grade})`);
  }
  return lines.join('\n');
}

export function renderMarkdownExport(view, trophies, state, estimates) {
  view.replaceChildren();
  view.append(el('h2', null, 'Export your checklist'));
  view.append(el('p', 'lede', 'A plain-text checklist you can paste anywhere — a notes app, a forum post, a group chat. Ticks, grades, difficulty and hours, grouped by roadmap stage. Copy it or download it as a Markdown file.'));
  const text = markdownChecklist(trophies, state, estimates);
  const box = document.createElement('textarea');
  box.className = 'mdBox';
  box.readOnly = true;
  box.value = text;
  box.rows = 24;
  view.append(box);
  const row = el('div', 'pickActions');
  const copy = el('button', null, 'Copy checklist');
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = 'Copied ✓';
    } catch {
      box.select();
      copy.textContent = 'Select & copy (clipboard blocked)';
    }
  });
  const download = el('button', 'ghost', 'Download .md');
  download.type = 'button';
  download.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    a.download = 'leonida-ledger-checklist.md';
    a.click();
  });
  row.append(copy, download);
  view.append(row);
}
