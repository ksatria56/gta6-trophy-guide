// Views for Leonida Ledger: the checklist, the trophy guide pane, the roadmap,
// the missables page, the Next-up planner and the save page.
import { KIND_LABELS, countByGrade, filterTrophies, spoilerHidden, unearnedMissables } from './filters.js';
import { ROADMAP_STAGES, missableTrophies, nextUpQueue, stageProgress } from './roadmap.js';
import { bumpCounter, countEarned, isEarned, progressPercent, readCounter, readNote, resetOneTrophy, toggleEarned, writeNote } from './store.js';

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
