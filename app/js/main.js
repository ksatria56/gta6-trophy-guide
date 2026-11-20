// Leonida Ledger boot: load the trophy list, wire the toolbar, route the views.
import { countUnearned, filterTrophies } from './filters.js';
import { loadState, saveState, exportProgress, importProgress } from './store.js';
import { renderChecklist, renderDetail, renderMissables, renderPlanner, renderProgress, renderRoadmap, renderSave } from './views.js';

const view = document.getElementById('view');
const pane = document.getElementById('detailPane');
const detailBody = document.getElementById('detailBody');
const search = document.getElementById('search');
const gradeFilter = document.getElementById('gradeFilter');
const kindFilter = document.getElementById('kindFilter');
const spoilerToggle = document.getElementById('spoilerToggle');
const unearnedToggle = document.getElementById('unearnedToggle');
const filterCount = document.getElementById('filterCount');
const themeToggle = document.getElementById('themeToggle');

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const sources = doc.sources;
const state = loadState();

function controls() {
  return { query: search.value, grade: gradeFilter.value, kind: kindFilter.value, unearned: unearnedToggle.checked };
}

// The toolbar's count label: how many trophies the current filters show, so a
// narrowed search never looks like a missing trophy. Blank off the checklist.
function updateFilterCount() {
  const page = (location.hash || '#/').replace(/^#\//, '').split('/')[0] || '';
  if (page !== '' && page !== 'trophy') { filterCount.textContent = ''; return; }
  const shown = filterTrophies(trophies, state, search.value, gradeFilter.value, kindFilter.value, unearnedToggle.checked).length;
  filterCount.textContent = `${shown} of ${trophies.length} shown · ${countUnearned(trophies, state)} left to earn`;
}

function setNav(route) {
  for (const link of document.querySelectorAll('#mainNav a')) {
    link.classList.toggle('active', link.dataset.route === route);
  }
}

function route() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\//, '').split('/');
  const page = parts[0] || '';
  if (page === 'trophy') {
    renderDetail(pane, detailBody, trophies, sources, state, () => renderProgress(trophies, state));
    if (pane.hidden) { location.hash = '#/'; return; }
    renderChecklist(view, trophies, state, controls());
    setNav('checklist');
    updateFilterCount();
    return;
  }
  pane.hidden = true;
  if (page === 'roadmap') { renderRoadmap(view, trophies, state); setNav('roadmap'); }
  else if (page === 'missables') { renderMissables(view, trophies, state); setNav('missables'); }
  else if (page === 'planner') { renderPlanner(view, trophies, state); setNav('planner'); }
  else if (page === 'save') { renderSave(view, trophies, state); setNav('save'); }
  else { renderChecklist(view, trophies, state, controls()); setNav('checklist'); }
  renderProgress(trophies, state);
  updateFilterCount();
}

function applySettings() {
  document.documentElement.dataset.theme = state.theme;
  spoilerToggle.checked = state.spoiler;
  themeToggle.checked = state.theme === 'night';
}

spoilerToggle.addEventListener('change', () => {
  state.spoiler = spoilerToggle.checked;
  saveState(state);
  route();
});

themeToggle.addEventListener('change', () => {
  state.theme = themeToggle.checked ? 'night' : 'paper';
  saveState(state);
  applySettings();
});

search.addEventListener('input', () => route());
gradeFilter.addEventListener('change', () => route());
kindFilter.addEventListener('change', () => route());
unearnedToggle.addEventListener('change', () => route());

// Press / anywhere to jump to the search box (unless already typing in a field).
window.addEventListener('keydown', (event) => {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  event.preventDefault();
  search.focus();
});

// Press Escape to close the trophy guide pane and return to the checklist.
window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (pane.hidden) return;
  pane.hidden = true;
  location.hash = '#/';
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([exportProgress(state)], { type: 'application/json' }));
  a.download = 'leonida-ledger-progress.json';
  a.click();
});

document.getElementById('importFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const next = importProgress(await file.text());
    Object.assign(state, next);
    saveState(state);
    applySettings();
    route();
  } catch {
    window.alert('That file is not a Leonida Ledger progress export.');
  }
});

document.getElementById('detailClose').addEventListener('click', () => {
  pane.hidden = true;
  location.hash = '#/';
});

window.addEventListener('hashchange', route);
applySettings();
route();
