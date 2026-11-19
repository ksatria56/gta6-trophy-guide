// Leonida Ledger boot: load the trophy list, wire the toolbar, route the views.
import { loadState, saveState, exportProgress, importProgress } from './store.js';
import { renderChecklist, renderDetail, renderMissables, renderPlanner, renderProgress, renderRoadmap, renderSave } from './views.js';

const view = document.getElementById('view');
const pane = document.getElementById('detailPane');
const detailBody = document.getElementById('detailBody');
const search = document.getElementById('search');
const gradeFilter = document.getElementById('gradeFilter');
const kindFilter = document.getElementById('kindFilter');
const spoilerToggle = document.getElementById('spoilerToggle');
const themeToggle = document.getElementById('themeToggle');

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const sources = doc.sources;
const state = loadState();

function controls() {
  return { query: search.value, grade: gradeFilter.value, kind: kindFilter.value };
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
    return;
  }
  pane.hidden = true;
  if (page === 'roadmap') { renderRoadmap(view, trophies, state); setNav('roadmap'); }
  else if (page === 'missables') { renderMissables(view, trophies, state); setNav('missables'); }
  else if (page === 'planner') { renderPlanner(view, trophies, state); setNav('planner'); }
  else if (page === 'save') { renderSave(view, trophies, state); setNav('save'); }
  else { renderChecklist(view, trophies, state, controls()); setNav('checklist'); }
  renderProgress(trophies, state);
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
