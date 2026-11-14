// Presentation and safety enhancements. Health thresholds and source adapters stay in the original app.
let draftDirty = false;
let undoAction = null;
const originalSave = $('#save').onclick;
const originalDemo = $('#demo').onclick;
const originalExport = $('#exp').onclick;
const originalImport = $('#csv').onchange;
const originalCalendar = ics;
const originalTab = tab;
const originalTrends = renderTr;
const originalTasks = renderTk;
const originalEnvironment = renderEnv;
const originalOverview = renderOv;
let taskView = 'all';
function getPreference(key, fallback) {
  try { return localStorage.getItem('ahm-ui-' + key) || fallback; } catch { return fallback; }
}
function setPreference(key, value) {
  try { localStorage.setItem('ahm-ui-' + key, value); } catch { /* Preferences are optional. */ }
}
function taskVisible(completed, view) {
  return view === 'all' || (view === 'open' ? !completed : completed);
}
const appearance = document.createElement('label');
appearance.className = 'mission-label appearance-label';
appearance.textContent = 'Appearance';
const appearanceSelect = document.createElement('select');
appearanceSelect.setAttribute('aria-label', 'Appearance');
appearanceSelect.innerHTML = '<option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>';
const appearancePreference = getPreference('appearance', 'system');
appearanceSelect.value = ['system', 'light', 'dark'].includes(appearancePreference) ? appearancePreference : 'system';
function applyAppearance() {
  document.documentElement.dataset.theme = appearanceSelect.value;
}
appearanceSelect.onchange = () => { applyAppearance(); setPreference('appearance', appearanceSelect.value); };
applyAppearance(); appearance.append(appearanceSelect); $('.header-tools').append(appearance);
const screenNames = { ov: 'Overview', ci: 'Daily check-in', tr: 'Trends', bd: 'Body model', tk: 'Tasks', hz: 'Spaceflight hazards' };
// Trends screen is temporarily retired from navigation; the overview trend tiles cover it. Remove the next line to restore the tab.
$('nav button[data-t="tr"]').remove();
const contextBand = document.createElement('div');
contextBand.className = 'monitor-context';
contextBand.setAttribute('aria-label', 'Current monitor status');
contextBand.innerHTML = '<div><span class="context-label">Current screen</span><strong id="current-screen"></strong></div><div><span class="context-label">Latest saved check-in</span><strong id="saved-context"></strong></div><div><span class="context-label">Environment sources</span><strong id="source-context"></strong></div><div><span class="context-label">Check-in form</span><strong id="form-context"></strong></div>';
$('nav').after(contextBand);
function updateContext() {
  const current = $('nav button.on')?.dataset.t || 'ov';
  $('#current-screen').textContent = screenNames[current];
  const latest = E[E.length - 1];
  $('#saved-context').textContent = latest ? latest.d + ' · ' + keys.filter(key => real(latest, key)).length + '/' + keys.length + ' values' : 'No saved check-ins';
  const liveCount = [ENV.src, ENV.donki, ENV.noaa].filter(source => source === 'live').length;
  $('#source-context').textContent = ENV.src === 'none' ? 'Connecting · ' + liveCount + '/3 live' : liveCount + '/3 live' + (liveCount < 3 ? ' · limited availability' : '');
  $('#form-context').textContent = draftDirty ? 'Unsaved changes' : 'No unsaved changes';
  $('#form-context').classList.toggle('context-warning', draftDirty);
  document.title = screenNames[current] + ' · Astro Health Monitor';
}
function priorityOrder(levels) {
  return levels.map((level, index) => ({ level, index })).sort((a, b) => b.level - a.level || a.index - b.index).map(item => item.index);
}
renderOv = function() {
  originalOverview();
  const result = evaluate();
  if (result) {
    const grid = $('#ov > .grid');
    if (grid) {
      const cards = [...grid.children];
      priorityOrder(result.D.map(domain => domain.l)).forEach(index => {
        const card = cards[index];
        grid.append(card);
        if (result.D[index].l === 0) {
          const details = document.createElement('details');
          const summary = document.createElement('summary');
          summary.textContent = 'Assessment details';
          details.append(summary);
          [...card.children].filter(child => child.tagName !== 'H2').forEach(child => details.append(child));
          card.append(details);
        }
      });
    }
    const overall = $$('#ov > .bar').at(-1);
    if (overall) $('#ov').prepend(overall);
    renderTrendTiles();
  }
  updateContext();
};
// Keep source detail secondary to the selected health screen, without changing the feeds.
$('#hz').after($('#env'));

// Overview trend tiles: presentation only, values come from the saved entries unchanged.
function trendTicks(min, max, count) {
  const span = (max - min) || 1;
  const power = Math.pow(10, Math.floor(Math.log10(span / count)));
  const step = [1, 2, 2.5, 5, 10].map(factor => factor * power).find(size => span / size <= count) || power * 10;
  const ticks = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step / 1000; value += step) ticks.push(Math.round(value * 1000) / 1000);
  return ticks;
}
function buildTrendChart(key, entries, detailed) {
  const values = entries.map(entry => entry[key]);
  const numeric = NUM.find(item => item[0] === key);
  const unit = numeric ? numeric[2] : '/10';
  const axisUnit = numeric ? numeric[2] : 'scale 1–10';
  const baseline = base()?.[key];
  let mn = Math.min(...values, ...(baseline == null ? [] : [baseline]));
  let mx = Math.max(...values, ...(baseline == null ? [] : [baseline]));
  if (mn === mx) { mn -= 1; mx += 1; }
  const pad = (mx - mn) * 0.08; mn -= pad; mx += pad;
  const W = detailed ? 920 : 320, H = detailed ? 430 : 110;
  const m = detailed ? { top: 24, right: 56, bottom: 64, left: 76 } : { top: 8, right: 8, bottom: 8, left: 8 };
  const X = index => m.left + index * (W - m.left - m.right) / (entries.length - 1);
  const Y = value => H - m.bottom - (value - mn) / (mx - mn) * (H - m.top - m.bottom);
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="' + (detailed ? 'trend-chart-large' : 'trend-sparkline') + '" ' + (detailed ? 'role="img" aria-label="' + esc(NAMES[key]) + ' over time with labeled axes"' : 'aria-hidden="true"') + '>';
  if (detailed) {
    trendTicks(mn, mx, 6).forEach(tick => {
      const y = Y(tick);
      svg += '<line x1="' + m.left + '" x2="' + (W - m.right) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)"/>';
      svg += '<text x="' + (m.left - 8) + '" y="' + (y + 4) + '" text-anchor="end" fill="var(--mut)" font-size="12">' + tick + '</text>';
    });
    const tickCount = Math.min(entries.length, 6);
    [...new Set(Array.from({ length: tickCount }, (_, slot) => Math.round(slot * (entries.length - 1) / (tickCount - 1))))].forEach(index => {
      const x = X(index);
      svg += '<line x1="' + x + '" x2="' + x + '" y1="' + (H - m.bottom) + '" y2="' + (H - m.bottom + 6) + '" stroke="var(--fg)"/>';
      svg += '<text x="' + x + '" y="' + (H - m.bottom + 22) + '" text-anchor="middle" fill="var(--mut)" font-size="12">' + esc(entries[index].d) + '</text>';
    });
    svg += '<line x1="' + m.left + '" x2="' + m.left + '" y1="' + m.top + '" y2="' + (H - m.bottom) + '" stroke="var(--fg)"/>';
    svg += '<line x1="' + m.left + '" x2="' + (W - m.right) + '" y1="' + (H - m.bottom) + '" y2="' + (H - m.bottom) + '" stroke="var(--fg)"/>';
    svg += '<text x="' + (m.left + (W - m.left - m.right) / 2) + '" y="' + (H - 14) + '" text-anchor="middle" fill="var(--fg)" font-size="13" font-weight="600">Date of check-in</text>';
    svg += '<text transform="rotate(-90)" x="' + (-(m.top + (H - m.top - m.bottom) / 2)) + '" y="18" text-anchor="middle" fill="var(--fg)" font-size="13" font-weight="600">' + esc(NAMES[key]) + ' (' + esc(axisUnit) + ')</text>';
  }
  if (baseline != null) svg += '<line x1="' + m.left + '" x2="' + (W - m.right) + '" y1="' + Y(baseline) + '" y2="' + Y(baseline) + '" stroke="var(--mut)" stroke-dasharray="5 4"/>';
  svg += '<polyline fill="none" stroke="var(--acc)" stroke-width="2.5" points="' + values.map((value, index) => X(index) + ',' + Y(value)).join(' ') + '"/>';
  if (detailed) svg += values.map((value, index) => '<circle cx="' + X(index) + '" cy="' + Y(value) + '" r="4" fill="var(--acc)"><title>' + esc(entries[index].d) + ': ' + esc(value) + ' ' + esc(unit) + '</title></circle>').join('');
  else svg += '<circle cx="' + X(values.length - 1) + '" cy="' + Y(values[values.length - 1]) + '" r="3.5" fill="var(--acc)"/>';
  return svg + '</svg>';
}
const trendDialog = document.createElement('dialog');
trendDialog.className = 'trend-dialog';
trendDialog.setAttribute('aria-labelledby', 'trend-dialog-title');
trendDialog.innerHTML = '<h2 id="trend-dialog-title"></h2><p class="sub" id="trend-dialog-meta"></p><div id="trend-dialog-chart"></div><p class="sub">Dashed: personal baseline (mean of the first 5 entries).</p><div class="dialog-actions"><button id="trend-dialog-close" class="pri" autofocus>Close</button></div>';
document.body.append(trendDialog);
function openTrendDialog(key) {
  const entries = allE().filter(entry => real(entry, key));
  if (entries.length < 2) return;
  const latest = entries[entries.length - 1];
  const unit = NUM.find(item => item[0] === key)?.[2] || '/10';
  $('#trend-dialog-title').textContent = NAMES[key];
  $('#trend-dialog-meta').textContent = entries.length + ' measured entries · ' + entries[0].d + ' to ' + latest.d + ' · Latest: ' + latest[key] + ' ' + unit;
  $('#trend-dialog-chart').innerHTML = buildTrendChart(key, entries, true);
  const previous = document.activeElement;
  const finish = () => { trendDialog.close(); previous?.focus(); };
  $('#trend-dialog-close').onclick = finish;
  trendDialog.oncancel = event => { event.preventDefault(); finish(); };
  trendDialog.showModal();
}
function renderTrendTiles() {
  const tracked = keys.map(key => ({ key, entries: allE().filter(entry => real(entry, key)) })).filter(item => item.entries.length >= 2);
  if (!tracked.length) return;
  const section = document.createElement('section');
  section.className = 'trend-tiles-section';
  section.setAttribute('aria-label', 'Measurement trends');
  section.innerHTML = '<h2>Trends</h2><p class="sub">Measured values over time. Select a tile to enlarge its chart with labeled axes.</p><div class="trend-tiles">' + tracked.map(({ key, entries }) => {
    const latest = entries[entries.length - 1], previous = entries[entries.length - 2];
    const change = f1(latest[key] - previous[key]);
    const unit = NUM.find(item => item[0] === key)?.[2] || '/10';
    return '<button type="button" class="trend-tile" data-trend="' + key + '" aria-haspopup="dialog" aria-label="' + esc(NAMES[key]) + ': latest ' + esc(latest[key]) + ' ' + esc(unit) + ' on ' + esc(latest.d) + ', change ' + (change > 0 ? '+' : '') + change + ' since the previous entry. Enlarge the trend chart.">'
      + '<span class="trend-tile-name">' + esc(NAMES[key]) + '</span>'
      + '<span class="trend-tile-value">' + esc(latest[key]) + ' ' + esc(unit) + '<small>' + (change > 0 ? '+' : '') + change + ' vs. previous</small></span>'
      + buildTrendChart(key, entries, false)
      + '<span class="trend-tile-range">' + esc(entries[0].d) + ' to ' + esc(latest.d) + ' · ' + entries.length + ' entries</span>'
      + '</button>';
  }).join('') + '</div>';
  $('#ov').append(section);
  $$('#ov .trend-tile').forEach(tile => { tile.onclick = () => openTrendDialog(tile.dataset.trend); });
}

const confirmation = document.createElement('dialog');
confirmation.setAttribute('aria-labelledby', 'confirm-title');
confirmation.setAttribute('aria-describedby', 'confirm-message');
confirmation.innerHTML = '<h2 id="confirm-title"></h2><p id="confirm-message"></p><div class="dialog-actions"><button id="confirm-cancel" autofocus>Cancel</button><button id="confirm-accept" class="pri"></button></div>';
document.body.append(confirmation);
function askConfirmation(title, message, action) {
  return new Promise(resolve => {
    $('#confirm-title').textContent = title;
    $('#confirm-message').textContent = message;
    $('#confirm-accept').textContent = action;
    const previous = document.activeElement;
    const finish = accepted => { confirmation.close(); previous?.focus(); resolve(accepted); };
    $('#confirm-cancel').onclick = () => finish(false);
    $('#confirm-accept').onclick = () => finish(true);
    confirmation.oncancel = event => { event.preventDefault(); finish(false); };
    confirmation.showModal();
  });
}
$('#tx').textContent = 'Dismiss';
$('#tx').onclick = () => { $('#toast').style.display = 'none'; updateContext(); };
$('nav').before($('#toast'));
const undoButton = document.createElement('button');
undoButton.textContent = 'Undo'; undoButton.hidden = true;
const toastActions = document.createElement('div');
toastActions.className = 'toast-actions';
toastActions.append(undoButton, $('#tx')); $('#toast').append(toastActions);
showToast = function(message, undo) {
  $('#tt').textContent = message;
  const failure = /failed|not completed/i.test(message);
  $('#toast').className = 'bar ' + (failure ? 'l2' : message.startsWith('Due:') ? 'l1' : 'l0');
  $('#toast').setAttribute('role', failure ? 'alert' : 'status');
  $('#toast').style.display = 'flex';
  undoAction = undo || null; undoButton.hidden = !undoAction;
};
undoButton.onclick = () => {
  const action = undoAction; if (!action) return;
  action(); showToast('Previous data restored.');
};
function snapshot() {
  const entries = JSON.stringify(E), tasks = JSON.stringify(TL);
  return () => { E = JSON.parse(entries); TL = JSON.parse(tasks); store(); saveTL(); renderOv(); refreshCurrentScreen(); };
}
function refreshCurrentScreen() {
  const current = $('nav button.on'); if (current) tab(current.dataset.t, false);
}
function updateDraft() {
  draftDirty = true;
  $$('#ci input[aria-invalid]').forEach(input => { if (input.checkValidity()) input.removeAttribute('aria-invalid'); });
  if (!$('#ci input[aria-invalid]')) $('#form-error').classList.add('hide');
  const count = NUM.filter(item => TOUCH[item[0]] || SRC[item[0]]).length;
  $('#draft-state').textContent = 'Unsaved changes · ' + count + ' measurements';
  NUM.forEach(item => {
    const status = $('#n_' + item[0]).parentElement.querySelector('.field-status');
    status.textContent = SRC[item[0]] ? 'Device measurement' : TOUCH[item[0]] ? 'Entered' : 'Suggested · not measured';
  });
  updateContext();
}
NUM.forEach(item => {
  const field = $('#n_' + item[0]);
  const status = document.createElement('span'); status.className = 'field-status';
  status.id = 'hint_' + item[0]; status.textContent = 'Suggested · not measured';
  field.parentElement.append(status); field.setAttribute('aria-describedby', status.id);
});
$('#n_d').required = true;
$('#n_d').parentElement.firstChild.textContent = 'Date (required)';
$$('#ci input').forEach(input => input.addEventListener('input', updateDraft));
$$('#ci input[type=number], #ci input[type=date]').forEach(input => input.addEventListener('change', () => {
  if (!input.checkValidity()) validateCheckIn();
}));
window.addEventListener('beforeunload', event => { if (draftDirty) { event.preventDefault(); event.returnValue = ''; } });
function validateCheckIn() {
  const fields = [$('#n_d'), ...NUM.map(item => $('#n_' + item[0]))];
  fields.forEach(field => field.removeAttribute('aria-invalid'));
  const invalidFields = fields.filter(field => !field.checkValidity());
  const invalid = invalidFields[0];
  const error = $('#form-error');
  if (!invalid) { error.classList.add('hide'); return true; }
  invalidFields.forEach(field => { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', [field.id === 'n_d' ? '' : 'hint_' + field.id.slice(2), 'form-error'].filter(Boolean).join(' ')); });
  error.textContent = invalid.id === 'n_d' ? 'Choose a date before saving your check-in.' :
    'Check ' + NAMES[invalid.id.slice(2)] + ': enter a value from ' + invalid.min + ' to ' + invalid.max + ', in steps of ' + invalid.step + '.';
  error.classList.remove('hide'); invalid.focus(); return false;
}
$('#save').onclick = async () => {
  if (!validateCheckIn()) return;
  const date = $('#n_d').value;
  if (E.some(entry => entry.d === date) && !await askConfirmation('Replace this check-in?', 'An entry for ' + date + ' already exists. Saving will replace it. You can undo this change.', 'Replace entry')) return;
  const undo = snapshot();
  // Empty measurements must retain the original app's unmeasured status.
  NUM.forEach(item => { if (!$('#n_' + item[0]).value) { delete TOUCH[item[0]]; delete SRC[item[0]]; } });
  originalSave(); draftDirty = false;
  tab('ci', false);
  $('#draft-state').textContent = 'All changes saved';
  NUM.forEach(item => { $('#n_' + item[0]).parentElement.querySelector('.field-status').textContent = 'Suggested · not measured'; });
  showToast('Check-in saved for ' + date + '.', undo);
  updateContext();
};
$('#demo').onclick = async () => {
  if ((E.length || draftDirty) && !await askConfirmation('Load demo data?', 'This replaces saved entries with 21 sample days. Your unsaved form stays unchanged. You can undo the replacement.', 'Load demo data')) return;
  const undo = snapshot(); originalDemo(); tab('ov');
  showToast('Loaded 21 days of demo data.', undo); $('.data-tools').open = false;
};
$('#rst').onclick = async () => {
  if (!E.length) { showToast('There are no saved entries to delete.'); return; }
  if (!await askConfirmation('Delete all saved entries?', 'Your saved health entries will be removed from this browser. Task history and your unsaved check-in stay unchanged. You can undo this deletion.', 'Delete entries')) return;
  const undo = snapshot(); E = []; store(); renderOv(); refreshCurrentScreen();
  showToast('Saved health entries deleted.', undo); $('.data-tools').open = false;
};
$('#exp').onclick = () => {
  if (!E.length) { showToast('No saved entries to export. Save a check-in first.'); return; }
  originalExport(); showToast('Export prepared: health-log.json.'); $('.data-tools').open = false;
};
$('#csv').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  const text = await file.text();
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(/[;,]/).map(value => value.trim().toLowerCase());
  const dateIndex = header.findIndex(value => value === 'date' || value === 'datum');
  if (dateIndex < 0 || lines.length < 2 || !header.some(value => keys.includes(value))) {
    dvs('Import not completed. Use a CSV with a date column and a measurement column such as hr or sleep.'); showToast($('#dvs').textContent); event.target.value = ''; return;
  }
  const dates = lines.slice(1).filter(line => line.trim()).map(line => line.split(/[;,]/)[dateIndex]?.slice(0,10));
  if (dates.some(date => !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) {
    dvs('Import not completed. Every row needs a valid date in YYYY-MM-DD format.'); showToast($('#dvs').textContent); event.target.value = ''; return;
  }
  if (dates.some(date => E.some(entry => entry.d === date)) && !await askConfirmation('Replace matching entries?', 'This file contains dates already in your log. Importing replaces those entries. You can undo the import.', 'Import and replace')) { event.target.value = ''; return; }
  const undo = snapshot(); $('#b_csv').disabled = true; $('#b_csv').textContent = 'Importing…';
  try { await originalImport(event); showToast('Imported ' + new Set(dates).size + ' days from CSV.', undo); }
  catch { dvs('Import failed. Check the CSV format and try again.'); undo(); showToast($('#dvs').textContent); }
  finally { $('#b_csv').disabled = false; $('#b_csv').textContent = 'Import CSV'; }
};
tab = function(id, moveFocus = true) {
  originalTab(id);
  $$('.skip-link').forEach(link => link.href = '#' + id);
  $$('nav button').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.t === id)); button.tabIndex = button.dataset.t === id ? 0 : -1; });
  updateContext();
  if (moveFocus) { const panel = $('#' + id); panel.focus({preventScroll:true}); panel.scrollIntoView({block:'start'}); }
};
$$('nav button').forEach((button, index, buttons) => {
  button.id = 'tab-' + button.dataset.t; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', button.dataset.t);
  const panel = $('#' + button.dataset.t); panel.tabIndex = -1; panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-labelledby',button.id);
  button.onkeydown = event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
    if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next === undefined) return;
    event.preventDefault(); tab(buttons[next].dataset.t, false); buttons[next].focus();
  };
});
renderTr = function() {
  originalTrends();
  const key = $('#met').value || 'hr';
  const entries = allE().filter(entry => real(entry,key));
  if (entries.length < 2) return;
  const latest = entries[entries.length - 1], previous = entries[entries.length - 2];
  const change = f1(latest[key] - previous[key]);
  const unit = NUM.find(item => item[0] === key)?.[2] || '/10';
  const comparison = document.createElement('p');
  comparison.className = 'trend-comparison';
  comparison.textContent = 'Latest: ' + latest[key] + ' ' + unit + ' (' + latest.d + ') · Previous: ' + previous[key] + ' ' + unit + ' (' + previous.d + ') · Change: ' + (change > 0 ? '+' : '') + change + ' ' + unit;
  $('#chart').prepend(comparison);
  $('#chart').insertAdjacentHTML('beforeend','<details class="trend-data"><summary>Measurement history (' + entries.length + ' entries)</summary><table><caption>' + esc(NAMES[key]) + '</caption><thead><tr><th scope="col">Date</th><th scope="col">Value</th></tr></thead><tbody>' + entries.map(entry => '<tr><td>' + esc(entry.d) + '</td><td>' + esc(entry[key]) + '</td></tr>').join('') + '</tbody></table></details>');
  $('#met').onchange = renderTr;
};
renderTk = function() {
  originalTasks();
  const filterBar = document.createElement('div');
  filterBar.className = 'task-filters'; filterBar.setAttribute('role', 'group'); filterBar.setAttribute('aria-label', 'Task view');
  const taskInputs = $$('#tk input[data-k]');
  for (const [value, label] of [['all', 'All'], ['open', 'Open'], ['completed', 'Completed']]) {
    const button = document.createElement('button');
    const count = taskInputs.filter(input => taskVisible(input.checked, value)).length;
    button.textContent = label + ' (' + count + ')'; button.dataset.view = value;
    button.setAttribute('aria-pressed', String(taskView === value));
    button.onclick = () => { taskView = value; renderTk(); $('#tk button[data-view="' + value + '"]').focus(); };
    filterBar.append(button);
  }
  $('#tk h2').after(filterBar);
  $$('#tk input[data-k]').forEach(input => {
    input.parentElement.setAttribute('data-task', input.dataset.k);
    input.parentElement.hidden = !taskVisible(input.checked, taskView);
    const handler = input.onchange;
    if (!handler) return;
    input.onchange = () => { const completed = input.checked; const task = TASKS.find(task => task.id === input.dataset.k); handler(); showToast((completed ? 'Completed: ' : 'Reopened: ') + task.n); const next = $('#tk input[data-k="' + task.id + '"]'); if (next && !next.parentElement.hidden) next.focus(); else $('#tk button[data-view="' + taskView + '"]').focus(); };
  });
  $('#ics').onclick = () => { originalCalendar(); showToast('Calendar prepared: astro-health-reminders.ics.'); };
};
renderEnv = function() {
  originalEnvironment();
  const paragraphs = $$('#env > .sub');
  if (paragraphs.length) {
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Source availability and limitations';
    details.append(summary, ...paragraphs); $('#env').append(details);
    paragraphs[0].append(document.createTextNode(' Unavailable live sources are not included in the assessment. Sample cabin readings are labeled and do not generate warnings. ISS item identifiers and units require independent verification before operational use.'));
  }
  $('#env .src').setAttribute('aria-busy', String(ENV.src === 'none'));
  updateContext();
  $('#env').classList.toggle('hide', !$('nav button[data-t="ov"]').classList.contains('on') && !$('nav button[data-t="hz"]').classList.contains('on'));
};
const enhancedTab = tab;
tab = function(id, moveFocus = true) { enhancedTab(id, moveFocus); $('#env').classList.toggle('hide', id !== 'ov' && id !== 'hz'); };
BodyAnatomy.mount($('#bsvg'));
$$('#bsvg .rg').forEach(region => {
  region.tabIndex = 0;
  region.setAttribute('role', 'button');
  region.setAttribute('aria-label', REG[region.dataset.r].n);
  region.setAttribute('aria-controls', 'bp');
  region.onclick = () => { SEL = region.dataset.r; renderBody(); };
  region.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); region.onclick(); } };
  region.setAttribute('aria-pressed',String(region.dataset.r === SEL));
});
$('#dvs').setAttribute('role','status');
$('#met').setAttribute('aria-label','Trend measurement');
$('#b_hr').textContent = 'Connect pulse monitor'; $('#b_bp').textContent = 'Connect blood pressure monitor';
$('#b_ox').textContent = 'Connect oxygen monitor'; $('#b_t').textContent = 'Connect thermometer';
const originalSample = onSample;
onSample = function(key, value, source) { originalSample(key, value, source); if (SRC[key]) updateDraft(); };
// Keep remote source values and medical evaluation unchanged, including uncertain telemetry.
renderOv(); renderEnv(); tab('ov', false);
const trendPreference = getPreference('trend', 'hr');
originalTrends();
if ([...$('#met').options].some(option => option.value === trendPreference)) $('#met').value = trendPreference;
$('#met').addEventListener('change', () => setPreference('trend', $('#met').value));
// SVG callouts share the existing anatomy controls; they add no duplicate tab stops.
$$('#bsvg .anatomy-landmark').forEach(marker => {
  const region = $('#bsvg .rg[data-r="' + marker.dataset.landmark + '"]');
  marker.onclick = () => { region.onclick(); region.focus({ preventScroll: true }); };
});
// Give small body regions equivalent full-size keyboard and touch controls.
const bodyControls = document.createElement('div');
bodyControls.className = 'body-controls'; bodyControls.setAttribute('role', 'group'); bodyControls.setAttribute('aria-label', 'Body regions');
for (const [key, region] of Object.entries(REG)) {
  const button = document.createElement('button'); button.textContent = region.n;
  button.dataset.region = key; button.setAttribute('aria-controls', 'bp'); button.setAttribute('aria-pressed', String(key === SEL));
  button.onclick = () => { $('#bsvg .rg[data-r="' + key + '"]').onclick(); };
  bodyControls.append(button);
}
const anatomyColumn = document.createElement('div');
anatomyColumn.className = 'anatomy-column';
$('#bsvg').before(anatomyColumn);
const anatomyCaption = document.createElement('div');
anatomyCaption.className = 'anatomy-caption';
anatomyCaption.innerHTML = '<strong>Human anatomy</strong><span>Anterior view · Eight monitored regions</span>';
const anatomyLegend = document.createElement('div');
anatomyLegend.className = 'anatomy-legend';
anatomyLegend.innerHTML = '<span data-state="0">NORMAL</span><span data-state="1">WATCH</span><span data-state="2">ACT</span><span data-state="n">UNAVAILABLE</span>';
anatomyColumn.append(anatomyCaption, $('#bsvg'), anatomyLegend, bodyControls);
$('#bd > .sub').hidden = true;
const originalBody = renderBody;
renderBody = function() {
  originalBody();
  const result = evaluate(), latest = E[E.length - 1];
  const states = {};
  Object.keys(REG).forEach(key => { states[key] = BodyAnatomy.status(key, result?.D[REG[key].d], latest, real); });
  $$('#bsvg .rg').forEach(region => {
    const key = region.dataset.r, state = states[key];
    region.setAttribute('class', 'rg rg' + state + (key === SEL ? ' sel' : ''));
    region.setAttribute('aria-pressed', String(key === SEL));
    region.setAttribute('aria-label', REG[key].n + ' · ' + (state === 'n' ? 'Unavailable or incomplete' : LBL[state]));
  });
  $$('#bsvg .anatomy-landmark').forEach(marker => {
    marker.dataset.state = states[marker.dataset.landmark];
    marker.classList.toggle('sel', marker.dataset.landmark === SEL);
  });
  $$('.body-controls button').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.region === SEL));
    const state = states[button.dataset.region];
    button.dataset.state = state;
    button.setAttribute('aria-label', REG[button.dataset.region].n + ' · ' + (state === 'n' ? 'Unavailable or incomplete' : LBL[state]));
  });
  const heading = $('#bp h2');
  if (states[SEL] === 'n') {
    heading.querySelector('.pill')?.remove();
    heading.insertAdjacentHTML('beforeend', '<span class="pill anatomy-unavailable">UNAVAILABLE</span>');
    $$('#bp .sub').filter(el => el.textContent === 'No deviation.' || el.textContent === 'No data yet.').forEach(el => {
      el.textContent = SEL === 'eye' ? 'No vision test measurement is stored. Symptom reports are not a confirmed normal eye examination.' : 'Missing or incomplete measurements. Normal health cannot be confirmed.';
    });
  }
  const readings = document.createElement('div');
  readings.className = 'anatomy-readings';
  const available = (BodyAnatomy.fields[SEL] || []).filter(key => latest && real(latest, key) && Number.isFinite(latest[key]));
  readings.innerHTML = '<h3>Latest saved readings</h3>' + (latest ? '<p class="sub">' + esc(latest.d) + ' · Entered or device-measured values</p>' : '') + (available.length ? '<dl>' + available.map(key => {
    const item = NUM.find(item => item[0] === key);
    return '<div><dt>' + esc(NAMES[key]) + '</dt><dd>' + esc(latest[key]) + ' ' + esc(item ? item[2] : '/10') + '</dd></div>';
  }).join('') + '</dl>' : '<p class="sub">No measured readings for this region.</p>');
  heading.after(readings);
};
$('#bsvg').parentElement.classList.add('body-layout');
$('#bd > .grid').classList.add('anatomy-layout');
$('#bp').setAttribute('aria-live', 'polite');
const viewOverview = document.createElement('button');
viewOverview.textContent = 'View overview'; viewOverview.onclick = () => tab('ov');
$('#draft-state').after(viewOverview);

// Send only user-approved context to the same-origin React wellness panel.
const wellnessButton = document.createElement('button');
wellnessButton.id = 'wellness-open';
wellnessButton.textContent = 'Wellness guidance';
wellnessButton.onclick = () => {
  const readings = E.slice(-7).map(entry => ({
    date: entry.d,
    values: [...NUM, ...SL].filter(item => real(entry, item[0]) && Number.isFinite(entry[item[0]])).map(item => ({ name: item[1], value: entry[item[0]], unit: NUM.includes(item) ? item[2] : '/10' })),
    symptoms: CK.filter(item => entry[item[0]] === true).map(item => item[1]),
  }));
  window.parent.postMessage({ type: 'astro:wellness-open', readings, mission: P().n }, window.location.origin);
};
$('.header-tools').append(wellnessButton);
const evaluationLink = document.createElement('a');
evaluationLink.href = '/evaluation'; evaluationLink.target = '_blank'; evaluationLink.rel = 'noopener';
evaluationLink.textContent = 'Task evaluation';
evaluationLink.className = 'evaluation-link';
$('.tool-menu').append(evaluationLink);
const researchLink = document.createElement('a');
researchLink.href = '/research'; researchLink.target = '_top';
researchLink.textContent = 'NASA Research Data Analytics';
researchLink.className = 'evaluation-link';
$('.tool-menu').append(researchLink);
const researchShortcut = researchLink.cloneNode(true);
researchShortcut.className = 'research-shortcut';
$('.header-tools').append(researchShortcut);
const nasaKeyLabel = document.createElement('label');
nasaKeyLabel.className = 'mission-label'; nasaKeyLabel.textContent = 'NASA API key (optional, stored on this device)';
const nasaKeyInput = document.createElement('input');
nasaKeyInput.type = 'password'; nasaKeyInput.autocomplete = 'off'; nasaKeyInput.maxLength = 128;
nasaKeyInput.setAttribute('aria-label', 'NASA API key'); nasaKeyInput.value = getPreference('nasa-key', '');
nasaKeyInput.onchange = () => {
  if (nasaKeyInput.value && !/^[a-zA-Z0-9_-]{1,128}$/.test(nasaKeyInput.value)) { nasaKeyInput.setCustomValidity('Use a valid NASA API key.'); nasaKeyInput.reportValidity(); return; }
  nasaKeyInput.setCustomValidity(''); setPreference('nasa-key', nasaKeyInput.value); void loadEnv();
};
nasaKeyLabel.append(nasaKeyInput); $('.tool-menu').append(nasaKeyLabel);

// ===== 11 NASA Spaceflight Risks Dashboard + simulate_health_data.py Integration =====
screenNames.rk = '11 Spaceflight Risks';
const riskSection = document.createElement('section');
riskSection.id = 'rk';
riskSection.className = 'hide card';
$('#hz').after(riskSection);

const riskTabButton = document.createElement('button');
riskTabButton.dataset.t = 'rk';
riskTabButton.id = 'tab-rk';
riskTabButton.setAttribute('role', 'tab');
riskTabButton.setAttribute('aria-controls', 'rk');
riskTabButton.setAttribute('aria-selected', 'false');
riskTabButton.tabIndex = -1;
riskTabButton.textContent = '11 Risks';
$('nav').append(riskTabButton);
riskSection.tabIndex = -1;
riskSection.setAttribute('role', 'tabpanel');
riskSection.setAttribute('aria-labelledby', 'tab-rk');

$$('nav button').forEach((button, index, buttons) => {
  button.onclick = () => tab(button.dataset.t);
  button.onkeydown = event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
    if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next === undefined) return;
    event.preventDefault(); tab(buttons[next].dataset.t, false); buttons[next].focus();
  };
});

const SPACE_RISKS_11 = [
  {
    num: 1,
    key: 'immune_response',
    cat: 'env',
    nameEn: 'Altered Immune System Responses',
    nameDe: 'Veränderte Immunantwort',
    desc: 'Microgravity, radiation, and stress dysregulate innate and adaptive immunity, elevating systemic inflammation (hs-CRP) and latent virus (EBV) reactivation.',
    measure: 'Oral/tympanic body temperature (°C), fatigue rating (1–10), skin/mucosal symptom check, and finger-stick hs-CRP / T-cell function assay.',
    prompt: 'Weekly Immune & Symptom Biomarker Check: inspect skin/mucosa and log temperature + hs-CRP.',
    act1: ['Prioritize 7+ hours of circadian-aligned sleep and reduce peak workload stress', 'Re-measure temperature after 2 h and log skin rash or allergy symptoms early'],
    act2: ['Contact the flight surgeon for inflammatory / viral reactivation workup', 'Consider crew isolation protocol if infectious symptoms accompany fever (≥ 38.0 °C)'],
    studies: [
      { osd: 'OSD-569', title: 'Inspiration4 Crew Whole Blood RNA-Seq & CBC', metrics: 'Differential CBC (leukocytes, lymphocytes, platelets), RNA-Seq', std: 'Integrated Immune / Standard Measures (Cellular Profile)' },
      { osd: 'OSD-575', title: 'Inspiration4 Serum Cytokine Array & Metabolomics', metrics: 'Multiplex cytokines (IL-6, TNF-α, IFN-γ), inflammation biomarkers', std: 'Integrated Immune / Standard Measures' },
      { osd: 'OSD-687', title: 'Inspiration4 T-Cell Histone Modification Profiling', metrics: 'T-cell differentiation, epigenetic histone modification in microgravity', std: 'Standard Measures (Cellular Profile)' }
    ]
  },
  {
    num: 2,
    key: 'sensorimotor_vestibular',
    cat: 'eva',
    nameEn: 'Altered Sensorimotor and Vestibular Function',
    nameDe: 'Sensorimotorische & Vestibuläre Störungen',
    desc: 'Gravity transitions (0G ↔ 0.16G Moon / 0.38G Mars / 1G Earth) impair otolith signaling, balance, spatial orientation, and locomotion, increasing fall risk during egress or surface EVAs.',
    measure: 'Functional Task Test (timed Sit-to-Stand in seconds, Eyes-Closed Tandem Walk % correct steps) and motion sickness score (0–20).',
    prompt: 'Gravity-Transition Balance Test: complete timed Sit-to-Stand and 10-step Eyes-Closed Tandem Walk.',
    act1: ['Perform slow, controlled head movements during posture or gravity transitions', 'Execute daily proprioceptive and balance stabilization drills'],
    act2: ['Delay critical surface EVA or unassisted vehicle egress until vestibular stability recovers', 'Coordinate anti-motion-sickness medication protocol with ground medical'],
    studies: [
      { osd: 'OSD-473', title: 'Otolith and Neuromuscular Locomotor Models', metrics: 'Balance adaptation, otolith stimulation, neuromuscular locomotor control', std: 'Functional Task Test (FTT) / Field Test (Sit-to-stand, Tandem-walk)' }
    ]
  },
  {
    num: 3,
    key: 'cardiovascular',
    cat: 'long',
    nameEn: 'Cardiovascular Adaptations',
    nameDe: 'Kardiovaskuläre Anpassung & Thromboserisiko (VTE)',
    desc: 'Fluid shifts and cardiac deconditioning cause orthostatic intolerance upon gravity reloading. Low serum albumin (< 3.5 g/dL) elevates venous thromboembolism (VTE) risk.',
    measure: 'Resting heart rate and blood pressure after 5 min rest, orthostatic ΔHR (supine-to-stand), and biochemical serum albumin (g/dL).',
    prompt: 'Orthostatic Vitals & Venous Screening: measure 5-min resting HR/BP followed by 3-min standing ΔHR.',
    act1: ['Repeat resting BP/HR after 30 min rest; execute fluid and electrolyte loading protocol', 'Prepare Lower Body Gradient Compression Garments (GCG) prior to gravity transitions'],
    act2: ['Contact flight surgeon immediately; pause high-strain exercise and record 12-lead ECG', 'Perform jugular venous ultrasound screening if serum albumin < 3.5 g/dL'],
    studies: [
      { osd: 'OSD-575', title: 'Inspiration4 Serum Cardiovascular Biomarkers', metrics: 'Troponin, cardiovascular proteins, transferrin (VTE risk factor)', std: 'Integrated Cardiovascular / CCISS / Biochemical Profile' },
      { osd: 'OSD-635', title: 'Human Aortic Smooth Muscle Cells in Microgravity', metrics: 'Vascular endothelial remodeling, arterial elasticity, wall shear stress', std: 'Biochemical Profile (Serum Albumin & Hematocrit)' },
      { osd: 'OSD-435', title: 'Human Induced Pluripotent Stem Cell Cardiomyocytes', metrics: 'Contractility and electrophysiological function of cardiomyocytes on ISS', std: 'Integrated Cardiovascular (Holter ECG, Finapres BP)' }
    ]
  },
  {
    num: 4,
    key: 'decompression_sickness',
    cat: 'eva',
    nameEn: 'Decompression Sickness (DCS)',
    nameDe: 'Dekompressionskrankheit (DCS)',
    desc: 'Depressurizing from cabin atmosphere (101.3 kPa) to lower EVA suit pressure (~29.6 kPa) can form nitrogen venous gas emboli (VGE) in tissues if O₂ pre-breathe is incomplete.',
    measure: '100% O₂ pre-breathe duration (min), EVA suit pressure (kPa), calculated Tissue N₂ Ratio, and post-EVA Doppler VGE score.',
    prompt: 'Pre-EVA Denitrogenation Verification: confirm ≥ 120 min O₂ pre-breathe and airlock suit pressure check.',
    act1: ['Extend 100% O₂ pre-breathe duration and include light denitrogenation ergometer exercise', 'Monitor closely for joint pain ("bends"), skin mottling, or paresthesia'],
    act2: ['Abort EVA depressurization immediately or re-pressurize airlock/suit to cabin pressure', 'Initiate 100% O₂ hyperbaric treatment protocol and alert flight surgeon'],
    studies: [
      { osd: 'OSD-684', title: 'Microvascular Response to Decompression Stress', metrics: 'Microvascular endothelial strain, gas-bubble-induced vascular stress markers', std: 'Prebreathe Reduction Program (PRP) (Doppler VGE Scores)' }
    ]
  },
  {
    num: 5,
    key: 'host_microorganism',
    cat: 'env',
    nameEn: 'Host-Microorganism Interactions',
    nameDe: 'Wirt-Mikroorganismus-Interaktionen',
    desc: 'Closed spacecraft habitats and altered diet reduce gut microbiome α-diversity (Shannon index) and promote opportunistic skin and nasal pathogen colonization (e.g., MRSA).',
    measure: 'Gut microbiome Shannon diversity index (H′), skin/nasal swab dysbiosis score (0–1), and GI/skin barrier symptoms.',
    prompt: 'Weekly Crew Microbiome Swab & Hygiene Protocol: collect skin/nasal swab and sanitize high-touch surfaces.',
    act1: ['Maintain probiotic and prebiotic fiber intake; apply skin barrier emollient', 'Execute targeted disinfection of high-touch cabin handrails, exercise gear, and headsets'],
    act2: ['Collect targeted microbial swab for on-orbit PCR pathogen identification', 'Consult flight surgeon for topical or systemic antimicrobial protocol'],
    studies: [
      { osd: 'OSD-630', title: 'Inspiration4 Stool Metagenomics', metrics: 'Gut microbiome diversity (Shannon index), relative taxa abundance, dysbiosis', std: 'Microbial Tracking / Standard Measures (Microbiome)' },
      { osd: 'OSD-572', title: 'Inspiration4 Skin Swab Metagenomics', metrics: 'Skin microbiome shifts, epidermal barrier integrity', std: 'Microbial Tracking / SWAB' },
      { osd: 'OSD-574', title: 'Inspiration4 Nasal Swab Metagenomics', metrics: 'Nasal mucosal colonization, opportunistic pathogen surveillance (MRSA)', std: 'Microbial Tracking / Hygiene Survey' }
    ]
  },
  {
    num: 6,
    key: 'hypoxia',
    cat: 'env',
    nameEn: 'Hypoxia & Atmospheric Stress',
    nameDe: 'Hypoxie & Atemgas-Belastung',
    desc: 'Reduced oxygen partial pressure (ppO₂) or elevated carbon dioxide (ppCO₂ / ppm) in closed habitats, rovers, or EVA suits impairs arterial oxygenation (SpO₂) and cognition.',
    measure: 'Finger-clip pulse oximetry (SpO₂ %), cabin/suit oxygen partial pressure ppO₂ (kPa), and cabin CO₂ (ppm / kPa).',
    prompt: 'Daily SpO₂ Oximetry & ECLSS Gas Check: verify SpO₂ ≥ 95%, ppO₂ ≥ 19.7 kPa, and CO₂ ≤ 3500 ppm.',
    act1: ['Check ECLSS air circulation fans, CO₂ scrubber cartridges (CDRA/LiOH), and O₂ valves', 'Reduce physical activity and avoid stagnant airflow zones'],
    act2: ['Switch to backup O₂ breathing loop immediately if SpO₂ < 92% or ppO₂ < 18.4 kPa', 'Alert crew and ground control; verify habitat/suit pressure integrity'],
    studies: [
      { osd: 'OSD-254', title: 'Cellular Responses to Hypoxia and Altered Gas Pressure', metrics: 'Cellular response to altered oxygen partial pressure (ppO₂) and hypoxia markers', std: 'VaPER / AGBRESA Bed Rest with elevated CO₂' }
    ]
  },
  {
    num: 7,
    key: 'nutrition',
    cat: 'long',
    nameEn: 'Inadequate Food and Nutrition',
    nameDe: 'Unzureichende Ernährung & Hydratation',
    desc: 'Spaceflight appetite suppression and menu fatigue lead to caloric deficits, dehydration, micronutrient depletion (Vitamin D, Iron), and increased renal stone risk.',
    measure: 'Daily meal intake (1–10 / % kcal target), daily hydration volume (L), fasting blood glucose (mg/dL), and serum Vitamin D (ng/mL).',
    prompt: 'Daily Nutrition & Hydration Log: record meal completion, ≥ 2.2 L fluid intake, and Vitamin D3 supplement.',
    act1: ['Log all meals, increase daily fluid intake to ≥ 2.2 L, and take scheduled Vitamin D3', 'Re-measure fasting blood glucose the following morning'],
    act2: ['Coordinate high-density caloric/electrolyte supplementation and renal stone prophylaxis with ground medical', 'If fasting blood glucose < 70 mg/dL, take fast-acting carbohydrates immediately'],
    studies: [
      { osd: 'OSD-575', title: 'Inspiration4 Serum Metabolic & Nutritional Profile', metrics: 'Metabolic panels (glucose, lipids, electrolytes, minerals, vitamin status)', std: 'Nutritional Status Assessment (Vitamin D, Ferritin, Iron)' },
      { osd: 'OSD-656', title: 'Inspiration4 Urine Proteomics & Inflammation Panel', metrics: 'Urine proteomics, inflammation markers, renal stone risk profile (oxalate, uric acid)', std: 'Nutritional Biochemistry (24h Urine Void Pool)' }
    ]
  },
  {
    num: 8,
    key: 'eva_injury_performance',
    cat: 'eva',
    nameEn: 'Injury and Compromised Performance from Spacewalks',
    nameDe: 'Verletzungsrisiko & Leistungseinbußen bei EVAs',
    desc: 'Pressurized EVA gloves and suits cause severe forearm/hand-grip fatigue, shoulder joint compression, fingernail trauma, and metabolic thermal stress.',
    measure: 'Hand-grip dynamometer fatigue drop (%), EVA musculoskeletal strain rating (1–10), and core body temperature (°C).',
    prompt: 'EVA Biomechanics & Thermal Check: measure pre/post-EVA hand-grip force and monitor suit cooling loop.',
    act1: ['Take micro-rests during high-torque glove tasks and increase LCVG cooling water flow', 'Perform post-EVA forearm, shoulder, and spinal decompression stretching'],
    act2: ['Halt high-load EVA tool tasks immediately if core temp > 38.3 °C or grip fatigue > 38%', 'Return to airlock for thermal cool-down, hydration, and flight surgeon orthopedic review'],
    studies: [
      { osd: 'OSD-474', title: 'Musculoskeletal Strain and Biomechanics in Extreme Environments', metrics: 'Muscular overload, hand-grip fatigue, thermal strain in pressurized suits', std: 'EVA Glove Study / Biomechanics of Extravehicular Activity' }
    ]
  },
  {
    num: 9,
    key: 'fitness_deconditioning',
    cat: 'long',
    nameEn: 'Reduced Cardiorespiratory and Musculoskeletal Fitness',
    nameDe: 'Reduzierte Kardiorespiratorische & Muskuläre Fitness',
    desc: 'Mechanical unloading rapidly degrades lower-body muscle strength (Isometric Mid-Thigh Pull) and aerobic capacity (VO₂max) without consistent high-load countermeasures.',
    measure: 'Daily exercise duration (min, scaled to mission gravity), Isometric Mid-Thigh Pull (IMTP) force change (%), and VO₂max change (%).',
    prompt: 'Daily Countermeasure Exercise & Monthly IMTP/VO₂max Check: log resistive (ARED) + aerobic (T2/CEVIS) training.',
    act1: ['Complete full daily resistive and aerobic training block (approx. 120 min in 0G)', 'Ensure high-intensity aerobic intervals (Sprint protocol) and post-exercise protein intake'],
    act2: ['Adjust resistive loading prescription with ground exercise physiologist and flight surgeon', 'Postpone physically demanding surface EVA timelines until strength/aerobic baselines recover'],
    studies: [
      { osd: 'OSD-608', title: 'ALSDA Skeletal and Muscular Unloading Study', metrics: 'Muscle atrophy, force loss, myofiber type shift during unloading', std: 'Sprint Study (VO₂max, CEVIS Ergometer) / IMTP Force' },
      { osd: 'OSD-612', title: 'Skeletal Muscle Tissue Plasticity in Microgravity', metrics: 'Molecular pathways of muscle degradation and countermeasure response', std: 'ZeroT2 / Advanced Resistive Exercise Device (ARED)' }
    ]
  },
  {
    num: 10,
    key: 'sans_neuroocular',
    cat: 'long',
    nameEn: 'Spaceflight Associated Neuro-ocular Syndrome (SANS)',
    nameDe: 'Spaceflight-Associated Neuro-ocular Syndrome (SANS)',
    desc: 'Chronic cephalad fluid shift elevates intracranial and orbital pressure, causing optic nerve sheath distension (ONSD), optic disc edema, and hyperopic refractive shift.',
    measure: '2D ocular ultrasound Optic Nerve Sheath Diameter ONSD (mm), hyperopic refractive shift (diopters D), and near-vision / head-pressure symptoms.',
    prompt: 'Bi-Weekly SANS Ocular Ultrasound & Amsler Acuity Check: measure ONSD (mm) and test near vision at fixed distance.',
    act1: ['Perform scheduled Lower Body Negative Pressure (LBNP) or thigh-cuff countermeasure sessions', 'Repeat near-vision Amsler test and verify B-vitamin nutritional status'],
    act2: ['Discuss ocular findings with ground medical the same day; transmit ocular ultrasound / OCT', 'Adjust reading lens diopter prescription and evaluate intracranial pressure countermeasures'],
    studies: [
      { osd: 'OSD-569', title: 'Inspiration4 Vascular & Ocular Permeability Biomarkers', metrics: 'Blood-brain/retinal barrier integrity, vascular biomarkers correlated with fluid shifts', std: 'Fluid Shifts (ONSD Ultrasound, OCT Retinal Thickness, IOP)' }
    ]
  },
  {
    num: 11,
    key: 'bone_changes',
    cat: 'long',
    nameEn: 'Spaceflight-induced Bone Changes',
    nameDe: 'Raumflug-induzierter Knochenabbau',
    desc: 'Bone resorption exceeds formation ~3:1 in microgravity, causing trabecular and cortical bone mineral density (BMD) loss in weight-bearing skeleton (tibia, hip, spine).',
    measure: 'Tibial BMD change (%), biochemical bone resorption marker serum CTx (ng/mL), daily ARED exercise (min), and back pain (1–10).',
    prompt: 'Monthly Bone Turnover (Serum CTx) & Daily Axial ARED Loading Check: verify high-load squat/deadlift compliance.',
    act1: ['Maximize high-strain axial ARED squat/deadlift loading and verify Vitamin D3 + Calcium intake', 'Monitor back pain and avoid abrupt spinal flexion'],
    act2: ['Coordinate bone-protective training modification and antiresorptive evaluation with flight surgeon', 'Enforce post-landing skeletal impact precautions during recovery remodeling window'],
    studies: [
      { osd: 'OSD-608', title: 'ALSDA Bone Unloading & Microstructural Loss', metrics: 'Quantitative CT bone mineral density (BMD), trabecular microstructure loss', std: 'Bone Densitometry (DXA) / HR-pQCT Tibia (Walle et al. 2024)' },
      { osd: 'OSD-612', title: 'Rodent Research-10: Bone Tissue Regeneration', metrics: 'Molecular markers for osteoclast resorption vs. osteoblast bone formation', std: 'Biochemical Markers (Serum CTx, BSAP, Osteocalcin)' }
    ]
  }
];

const DEFAULT_SUPP_METRICS = {
  hsCrp: 1.1,
  tCellPct: 84,
  sitToStandS: 2.1,
  tandemWalkPct: 78,
  motionSickness: 1,
  orthoDeltaHr: 9,
  albumin: 4.2,
  o2PrebreatheMin: 140,
  suitPressureKpa: 29.6,
  gutShannon: 3.35,
  skinDysbiosis: 0.34,
  cabinPpo2: 20.8,
  hydrationL: 2.3,
  vitaminD: 32,
  gripFatiguePct: 18,
  evaStrain: 3.2,
  imtpChangePct: -4.5,
  vo2ChangePct: -4.0,
  onsdMm: 4.8,
  refractiveShift: 0.2,
  bmdChangePct: -1.4,
  serumCtx: 0.48
};

const CREW_SCENARIOS = {
  nominal: {
    label: 'Nominal Baseline Crew (All 11 Risks Green)',
    values: {
      hr: 60, sys: 116, dia: 74, spo2: 98, temp: 36.6, sleep: 7.5, ex: 120, co2: 2600, gluc: 88, meal: 9, back: 2, fatigue: 2,
      vision: false, head: false, dizzy: false, cough: false, rash: false, gi: false, eye: false,
      ...DEFAULT_SUPP_METRICS
    }
  },
  ast01: {
    label: 'Cmdr. Alex Mercer (AST-01 · SANS & Bone Turnover Scenario)',
    values: {
      hr: 62, sys: 120, dia: 77, spo2: 97, temp: 36.7, sleep: 6.8, ex: 95, co2: 3400, gluc: 92, meal: 8, back: 4, fatigue: 4,
      vision: true, head: true, dizzy: false, cough: false, rash: false, gi: false, eye: false,
      ...DEFAULT_SUPP_METRICS,
      onsdMm: 5.88, refractiveShift: 0.92, bmdChangePct: -2.7, serumCtx: 0.72, imtpChangePct: -9.2, vo2ChangePct: -8.5
    }
  },
  ast02: {
    label: 'Dr. Elena Vance (AST-02 · Cardiovascular VTE, Immune & Hypoxia Scenario)',
    values: {
      hr: 84, sys: 132, dia: 86, spo2: 91.5, temp: 37.6, sleep: 5.8, ex: 75, co2: 5200, gluc: 95, meal: 7, back: 3, fatigue: 7,
      vision: false, head: true, dizzy: false, cough: true, rash: true, gi: false, eye: false,
      ...DEFAULT_SUPP_METRICS,
      albumin: 3.38, orthoDeltaHr: 24, hsCrp: 3.9, tCellPct: 59, cabinPpo2: 18.2, gutShannon: 2.78, skinDysbiosis: 0.62
    }
  },
  ast03: {
    label: 'Spec. Kenji Takahashi (AST-03 · Surface EVA Decompression, Thermal & Sensorimotor Scenario)',
    values: {
      hr: 76, sys: 124, dia: 80, spo2: 95, temp: 38.4, sleep: 6.2, ex: 45, co2: 3800, gluc: 104, meal: 5, back: 7, fatigue: 8,
      vision: false, head: false, dizzy: true, cough: false, rash: false, gi: true, eye: false,
      ...DEFAULT_SUPP_METRICS,
      o2PrebreatheMin: 35, suitPressureKpa: 29.6, gripFatiguePct: 43, evaStrain: 8.1,
      sitToStandS: 4.4, tandemWalkPct: 36, motionSickness: 11,
      hydrationL: 1.45, vitaminD: 18.5, bmdChangePct: -4.8, serumCtx: 0.89, imtpChangePct: -16.2, vo2ChangePct: -15.4
    }
  }
};

function readSupplementalMetrics() {
  try {
    const raw = JSON.parse(localStorage.getItem('ahm-ui-risk-metrics') || 'null');
    return raw && typeof raw === 'object' ? { ...DEFAULT_SUPP_METRICS, ...raw } : { ...DEFAULT_SUPP_METRICS };
  } catch {
    return { ...DEFAULT_SUPP_METRICS };
  }
}

function writeSupplementalMetrics(next) {
  try { localStorage.setItem('ahm-ui-risk-metrics', JSON.stringify(next)); } catch { /* UI-only storage */ }
}

function readPromptLog() {
  try {
    const raw = JSON.parse(localStorage.getItem('ahm-ui-risk-prompts') || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function writePromptLog(next) {
  try { localStorage.setItem('ahm-ui-risk-prompts', JSON.stringify(next)); } catch { /* UI-only storage */ }
}

function evaluateSpaceRisks(m, exFactor = 1) {
  const results = SPACE_RISKS_11.map(r => ({ ...r, l: 0, reasons: [], metricsDisplay: [] }));
  const flag = (idx, level, text) => {
    results[idx].l = Math.max(results[idx].l, level);
    if (text) results[idx].reasons.push(text);
  };

  // 1. Immune System Responses
  const symCount = ['cough', 'rash', 'gi', 'eye'].filter(k => m[k]).length;
  results[0].metricsDisplay = [
    ['hs-CRP', m.hsCrp + ' mg/L', '< 1.8 mg/L'],
    ['T-cell function', m.tCellPct + '%', '≥ 75%'],
    ['Temperature', m.temp + ' °C', '36.1–37.4 °C']
  ];
  if (m.hsCrp > 3.5 || m.tCellPct < 62 || m.temp >= 38 || symCount >= 2) {
    flag(0, 2, `Elevated immune/inflammatory markers (hs-CRP ${m.hsCrp} mg/L, T-cell ${m.tCellPct}%, temp ${m.temp} °C)`);
  } else if (m.hsCrp > 1.8 || m.tCellPct < 75 || m.temp >= 37.5 || symCount === 1 || m.fatigue >= 6) {
    flag(0, 1, `Mild immune dysregulation or symptom onset (hs-CRP ${m.hsCrp} mg/L, T-cell ${m.tCellPct}%)`);
  }

  // 2. Sensorimotor and Vestibular Function
  results[1].metricsDisplay = [
    ['Sit-to-Stand', m.sitToStandS + ' s', '≤ 2.6 s'],
    ['Tandem walk (EC)', m.tandemWalkPct + '%', '≥ 65%'],
    ['Motion sickness', m.motionSickness + '/20', '0–3 /20']
  ];
  if (m.tandemWalkPct < 40 || m.sitToStandS > 4.2 || m.motionSickness >= 10 || (m.dizzy && (m.vision || m.head))) {
    flag(1, 2, `Severe balance/vestibular deficit (Tandem walk ${m.tandemWalkPct}%, Sit-to-Stand ${m.sitToStandS} s)`);
  } else if (m.tandemWalkPct < 65 || m.sitToStandS > 2.6 || m.motionSickness >= 4 || m.dizzy) {
    flag(1, 1, `Moderate sensorimotor adaptation strain (Sit-to-Stand ${m.sitToStandS} s, Tandem walk ${m.tandemWalkPct}%)`);
  }

  // 3. Cardiovascular Adaptations & VTE
  results[2].metricsDisplay = [
    ['Resting HR / BP', `${m.hr} bpm · ${m.sys}/${m.dia} mmHg`, '≤ 80 bpm · ≤ 130/85'],
    ['Orthostatic ΔHR', '+' + m.orthoDeltaHr + ' bpm', '≤ +14 bpm'],
    ['Serum albumin', m.albumin + ' g/dL', '≥ 3.8 g/dL']
  ];
  if (m.albumin < 3.5 || m.orthoDeltaHr > 22 || m.hr > 90 || m.sys > 140 || m.dia > 90) {
    flag(2, 2, `Critical cardiovascular / VTE alert (Albumin ${m.albumin} g/dL, ΔHR +${m.orthoDeltaHr} bpm, BP ${m.sys}/${m.dia})`);
  } else if (m.albumin < 3.8 || m.orthoDeltaHr > 14 || m.hr > 80 || m.sys > 130 || m.dia > 85) {
    flag(2, 1, `Elevated orthostatic strain or borderline albumin (${m.albumin} g/dL, ΔHR +${m.orthoDeltaHr} bpm)`);
  }

  // 4. Decompression Sickness (DCS)
  const n2Ratio = f1(Math.max(1.0, Math.min(1.88, 1.86 - (m.o2PrebreatheMin / 225))));
  const dcsIndex = Math.max(2, Math.min(95, Math.round((n2Ratio - 1.05) * 115)));
  results[3].metricsDisplay = [
    ['O₂ pre-breathe', m.o2PrebreatheMin + ' min', '≥ 120 min'],
    ['Tissue N₂ ratio', String(n2Ratio), '< 1.35'],
    ['DCS risk index', dcsIndex + '/100', '< 35 /100']
  ];
  if (dcsIndex >= 65 || m.o2PrebreatheMin < 60) {
    flag(3, 2, `High decompression sickness risk (DCS index ${dcsIndex}/100, O₂ pre-breathe only ${m.o2PrebreatheMin} min)`);
  } else if (dcsIndex >= 35 || m.o2PrebreatheMin < 110) {
    flag(3, 1, `Moderate nitrogen supersaturation before EVA (DCS index ${dcsIndex}/100, pre-breathe ${m.o2PrebreatheMin} min)`);
  }

  // 5. Host-Microorganism Interactions
  results[4].metricsDisplay = [
    ['Gut Shannon diversity', m.gutShannon + ' H′', '≥ 2.95 H′'],
    ['Skin/nasal dysbiosis', m.skinDysbiosis + ' (0–1)', '≤ 0.56'],
    ['GI / Rash symptoms', (m.gi || m.rash) ? 'Reported' : 'None', 'None']
  ];
  if (m.gutShannon < 2.55 || m.skinDysbiosis > 0.75 || (m.gi && m.rash)) {
    flag(4, 2, `Severe microbiome dysbiosis (Gut Shannon ${m.gutShannon}, skin dysbiosis ${m.skinDysbiosis})`);
  } else if (m.gutShannon < 2.95 || m.skinDysbiosis > 0.56 || m.gi || m.rash) {
    flag(4, 1, `Reduced gut/skin microbiome stability (Shannon ${m.gutShannon}, dysbiosis ${m.skinDysbiosis})`);
  }

  // 6. Hypoxia & Atmospheric Stress
  results[5].metricsDisplay = [
    ['SpO₂ saturation', m.spo2 + '%', '95–100%'],
    ['Cabin/suit ppO₂', m.cabinPpo2 + ' kPa', '19.7–22.5 kPa'],
    ['Cabin CO₂', m.co2 + ' ppm', '≤ 3500 ppm']
  ];
  if (m.spo2 < 92 || m.cabinPpo2 < 18.4 || m.co2 > 5000) {
    flag(5, 2, `Hypoxia / atmospheric gas alert (SpO₂ ${m.spo2}%, ppO₂ ${m.cabinPpo2} kPa, CO₂ ${m.co2} ppm)`);
  } else if (m.spo2 < 95 || m.cabinPpo2 < 19.7 || m.co2 > 3500) {
    flag(5, 1, `Borderline oxygenation or cabin CO₂ (SpO₂ ${m.spo2}%, ppO₂ ${m.cabinPpo2} kPa, CO₂ ${m.co2} ppm)`);
  }

  // 7. Inadequate Food and Nutrition
  const calPct = Math.round(Math.min(110, Math.max(50, m.meal * 10 + 12)));
  results[6].metricsDisplay = [
    ['Calorie intake / Meals', `${calPct}% (${m.meal}/10)`, '≥ 85% (≥ 7/10)'],
    ['Daily hydration', m.hydrationL + ' L', '≥ 1.9 L'],
    ['Vitamin D / Glucose', `${m.vitaminD} ng/mL · ${m.gluc} mg/dL`, '≥ 27 ng/mL · 70–99 mg/dL']
  ];
  if (m.hydrationL < 1.55 || m.vitaminD < 20 || m.meal <= 3 || m.gluc < 70 || m.gluc > 125) {
    flag(6, 2, `Significant nutritional/hydration deficit (${m.hydrationL} L fluid, Vit D ${m.vitaminD} ng/mL, glucose ${m.gluc} mg/dL)`);
  } else if (m.hydrationL < 1.9 || m.vitaminD < 27 || m.meal <= 5 || m.gluc >= 100) {
    flag(6, 1, `Suboptimal hydration, Vitamin D, or caloric intake (${m.hydrationL} L, Vit D ${m.vitaminD} ng/mL)`);
  }

  // 8. Injury and Compromised Performance from Spacewalks (EVA)
  results[7].metricsDisplay = [
    ['Hand-grip fatigue', m.gripFatiguePct + '%', '≤ 24%'],
    ['EVA strain score', m.evaStrain + '/10', '< 5.2 /10'],
    ['Core body temp', m.temp + ' °C', '36.2–37.7 °C']
  ];
  if (m.gripFatiguePct > 38 || m.evaStrain >= 7.5 || m.temp > 38.3) {
    flag(7, 2, `High EVA musculoskeletal strain or thermal load (Grip fatigue ${m.gripFatiguePct}%, strain ${m.evaStrain}/10, temp ${m.temp} °C)`);
  } else if (m.gripFatiguePct > 24 || m.evaStrain >= 5.2 || m.temp > 37.7) {
    flag(7, 1, `Moderate EVA forearm fatigue or suit thermal strain (Grip fatigue ${m.gripFatiguePct}%, strain ${m.evaStrain}/10)`);
  }

  // 9. Reduced Cardiorespiratory and Musculoskeletal Fitness
  results[8].metricsDisplay = [
    ['Daily exercise', `${m.ex} min (target ${Math.round(120 * exFactor)} min)`, `≥ ${Math.round(60 * exFactor)} min`],
    ['IMTP peak force Δ', m.imtpChangePct + '%', '≥ -8.0%'],
    ['VO₂max Δ', m.vo2ChangePct + '%', '≥ -8.0%']
  ];
  if (m.imtpChangePct < -15 || m.vo2ChangePct < -15 || m.ex < 30 * exFactor) {
    flag(8, 2, `Marked musculoskeletal/aerobic deconditioning (IMTP ${m.imtpChangePct}%, VO₂max ${m.vo2ChangePct}%, exercise ${m.ex} min)`);
  } else if (m.imtpChangePct < -8 || m.vo2ChangePct < -8 || m.ex < 60 * exFactor) {
    flag(8, 1, `Mild strength/aerobic fitness drift (IMTP ${m.imtpChangePct}%, VO₂max ${m.vo2ChangePct}%, exercise ${m.ex} min)`);
  }

  // 10. Spaceflight Associated Neuro-ocular Syndrome (SANS)
  results[9].metricsDisplay = [
    ['ONSD ultrasound', m.onsdMm + ' mm', '≤ 5.25 mm'],
    ['Refractive shift', '+' + m.refractiveShift + ' D', '< +0.45 D'],
    ['Ocular symptoms', (m.vision && m.head) ? 'Vision + head pressure' : (m.vision ? 'Vision change' : (m.head ? 'Head pressure' : 'None')), 'None']
  ];
  if (m.onsdMm > 5.75 || m.refractiveShift >= 0.85 || (m.vision && m.head)) {
    flag(9, 2, `SANS progression alert (ONSD ${m.onsdMm} mm, refractive shift +${m.refractiveShift} D${m.vision && m.head ? ', vision + head pressure' : ''})`);
  } else if (m.onsdMm > 5.25 || m.refractiveShift >= 0.45 || m.vision || m.head) {
    flag(9, 1, `Early SANS cephalad fluid-shift indicators (ONSD ${m.onsdMm} mm, shift +${m.refractiveShift} D)`);
  }

  // 11. Spaceflight-induced Bone Changes
  results[10].metricsDisplay = [
    ['Tibial BMD change', m.bmdChangePct + '%', '≥ -2.3%'],
    ['Serum CTx resorption', m.serumCtx + ' ng/mL', '≤ 0.68 ng/mL'],
    ['Back pain (3-day)', m.back + '/10', '< 5 /10']
  ];
  if (m.bmdChangePct < -4.5 || m.serumCtx > 0.85 || m.back >= 7) {
    flag(10, 2, `Accelerated bone resorption / skeletal strain (Tibia BMD ${m.bmdChangePct}%, CTx ${m.serumCtx} ng/mL, back pain ${m.back}/10)`);
  } else if (m.bmdChangePct < -2.3 || m.serumCtx > 0.68 || m.back >= 5) {
    flag(10, 1, `Elevated bone turnover imbalance (Tibia BMD ${m.bmdChangePct}%, CTx ${m.serumCtx} ng/mL)`);
  }

  const penalty = results.reduce((sum, r) => sum + (r.l === 2 ? 9 : r.l === 1 ? 4 : 0), 0);
  const readiness = Math.max(15, 100 - penalty);
  return { results, readiness };
}

const BODY_REGION_TO_RISKS = {
  brain: ['sensorimotor_vestibular', 'hypoxia'],
  eye: ['sans_neuroocular', 'sensorimotor_vestibular'],
  heart: ['cardiovascular', 'hypoxia'],
  immun: ['immune_response', 'host_microorganism'],
  gut: ['nutrition', 'host_microorganism'],
  bone: ['bone_changes', 'eva_injury_performance'],
  muscle: ['fitness_deconditioning', 'eva_injury_performance'],
  rad: ['decompression_sickness', 'hypoxia', 'immune_response']
};

let riskFilter = 'all';
let riskScenario = getPreference('risk-scenario', 'live');
if (!['live', 'nominal', 'ast01', 'ast02', 'ast03', 'sim'].includes(riskScenario)) riskScenario = 'live';

// Simulated Dataset State (loaded from /generated_data/astronaut_health_dataset.json generated by simulate_health_data.py)
let SIM_BUNDLE = null;
let simAstronautId = getPreference('sim-astronaut', 'AST-01');
let simMissionDay = Number(getPreference('sim-day', '56'));
if (!Number.isFinite(simMissionDay)) simMissionDay = 56;
let simChartMetric = getPreference('sim-metric', 'overall_readiness_score');

function mapSimRowToRiskMetrics(row) {
  return {
    hr: row.resting_hr_bpm,
    sys: row.systolic_bp_mmHg,
    dia: row.diastolic_bp_mmHg,
    spo2: row.spo2_pct,
    temp: row.core_temp_c,
    sleep: row.sleep_duration_h,
    ex: row.daily_exercise_min,
    co2: Math.round(row.cabin_ppco2_kPa * 9870),
    gluc: 92,
    meal: Math.max(1, Math.min(10, Math.round(row.calories_pct_target / 10))),
    back: row.bmd_tibia_change_pct < -4 ? 7 : (row.bmd_tibia_change_pct < -2 ? 5 : 2),
    fatigue: Math.max(1, Math.min(10, Math.round(11 - row.alertness_rating))),
    vision: row.refractive_shift_diopters >= 0.45,
    head: row.optic_nerve_sheath_mm > 5.25,
    dizzy: row.motion_sickness_score >= 4 || row.tandem_walk_ec_pct < 65,
    cough: false,
    rash: row.skin_dysbiosis_score > 0.65,
    gi: row.gut_shannon_diversity < 2.75,
    eye: false,
    hsCrp: row.hs_crp_mg_L,
    tCellPct: row.t_cell_function_pct,
    sitToStandS: row.sit_to_stand_s,
    tandemWalkPct: row.tandem_walk_ec_pct,
    motionSickness: row.motion_sickness_score,
    orthoDeltaHr: row.orthostatic_delta_hr_bpm,
    albumin: row.serum_albumin_g_dL,
    o2PrebreatheMin: row.environment === 'ROVER_EVA' ? row.o2_prebreathe_min : 145,
    suitPressureKpa: row.eva_suit_pressure_kPa,
    gutShannon: row.gut_shannon_diversity,
    skinDysbiosis: row.skin_dysbiosis_score,
    cabinPpo2: row.cabin_ppo2_kPa,
    hydrationL: row.hydration_liters,
    vitaminD: row.vitamin_d_ng_mL,
    gripFatiguePct: row.hand_grip_fatigue_pct,
    evaStrain: row.eva_musculoskeletal_strain,
    imtpChangePct: row.imtp_change_pct,
    vo2ChangePct: row.vo2_max_change_pct,
    onsdMm: row.optic_nerve_sheath_mm,
    refractiveShift: row.refractive_shift_diopters,
    bmdChangePct: row.bmd_tibia_change_pct,
    serumCtx: row.serum_ctx_ng_mL
  };
}

function getSimDailyRows(aid = simAstronautId) {
  if (!SIM_BUNDLE || !Array.isArray(SIM_BUNDLE.daily_timeseries)) return [];
  return SIM_BUNDLE.daily_timeseries.filter(r => r.astronaut_id === aid);
}

function getSimCurrentRow() {
  const rows = getSimDailyRows(simAstronautId);
  if (!rows.length) return null;
  return rows.find(r => r.mission_day === simMissionDay) || rows[Math.min(rows.length - 1, Math.max(0, simMissionDay + 14))] || rows[0];
}

function getActiveRiskMetrics(scenarioKey) {
  if (scenarioKey === 'sim') {
    const simRow = getSimCurrentRow();
    if (simRow) return mapSimRowToRiskMetrics(simRow);
  }
  if (scenarioKey !== 'live' && CREW_SCENARIOS[scenarioKey]) {
    return Object.assign({}, CREW_SCENARIOS[scenarioKey].values);
  }
  const supp = readSupplementalMetrics();
  const latest = E[E.length - 1];
  const baseVals = {
    hr: latest && real(latest, 'hr') ? latest.hr : 62,
    sys: latest && real(latest, 'sys') ? latest.sys : 118,
    dia: latest && real(latest, 'dia') ? latest.dia : 76,
    spo2: latest && real(latest, 'spo2') ? latest.spo2 : 97,
    temp: latest && real(latest, 'temp') ? latest.temp : 36.6,
    sleep: latest && real(latest, 'sleep') ? latest.sleep : 7.0,
    ex: Number.isFinite(lastAvg('ex', 3)) ? Math.round(lastAvg('ex', 3)) : (latest && real(latest, 'ex') ? latest.ex : 110),
    co2: latest && real(latest, 'co2') ? latest.co2 : 2900,
    gluc: latest && real(latest, 'gluc') ? latest.gluc : 90,
    meal: Number.isFinite(lastAvg('meal', 3)) ? f1(lastAvg('meal', 3)) : (latest && real(latest, 'meal') ? latest.meal : 8),
    back: Number.isFinite(lastAvg('back', 3)) ? f1(lastAvg('back', 3)) : (latest && real(latest, 'back') ? latest.back : 2),
    fatigue: latest && real(latest, 'fatigue') ? latest.fatigue : 3,
    vision: Boolean(latest?.vision),
    head: Boolean(latest?.head),
    dizzy: Boolean(latest?.dizzy),
    cough: Boolean(latest?.cough),
    rash: Boolean(latest?.rash),
    gi: Boolean(latest?.gi),
    eye: Boolean(latest?.eye)
  };
  return Object.assign({}, baseVals, supp);
}

const SIM_CHART_METRICS = [
  ['overall_readiness_score', 'Overall Readiness Score (0–100)'],
  ['optic_nerve_sheath_mm', 'SANS: Optic Nerve Sheath Diameter (mm)'],
  ['bmd_tibia_change_pct', 'Bone: Tibia BMD Change (%)'],
  ['imtp_change_pct', 'Fitness: IMTP Strength Change (%)'],
  ['serum_albumin_g_dL', 'Cardiovascular/VTE: Serum Albumin (g/dL)'],
  ['hs_crp_mg_L', 'Immune: hs-CRP Inflammation (mg/L)'],
  ['spo2_pct', 'Hypoxia: Arterial SpO₂ (%)'],
  ['tandem_walk_ec_pct', 'Sensorimotor: Eyes-Closed Tandem Walk (%)'],
  ['gut_shannon_diversity', 'Microbiome: Gut Shannon Diversity (H′)'],
  ['pvt_speed_score', 'Cognitive: PVT Psychomotor Vigilance Speed']
];

function buildSimLongitudinalSvg(rows, metricKey, currentDay) {
  if (!rows || rows.length < 2) return '<div class="sub">Loading simulated time-series…</div>';
  const vals = rows.map(r => Number(r[metricKey]) || 0);
  const W = 680, H = 190, padL = 42, padR = 14, padT = 16, padB = 28;
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (mn === mx) { mn -= 1; mx += 1; }
  const margin = (mx - mn) * 0.1;
  mn -= margin; mx += margin;
  const X = i => padL + (i * (W - padL - padR)) / (rows.length - 1);
  const Y = v => H - padB - ((v - mn) / (mx - mn)) * (H - padT - padB);
  const pts = vals.map((v, i) => `${f1(X(i))},${f1(Y(v))}`).join(' ');
  const curIdx = rows.findIndex(r => r.mission_day === currentDay);
  const curMarker = curIdx >= 0 ? `<line x1="${f1(X(curIdx))}" y1="${padT}" x2="${f1(X(curIdx))}" y2="${H - padB}" stroke="var(--warn)" stroke-dasharray="4 3" stroke-width="1.5"/><circle cx="${f1(X(curIdx))}" cy="${f1(Y(vals[curIdx]))}" r="5" fill="var(--warn)"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Simulated longitudinal time-series for ${esc(metricKey)}">
    <g stroke="var(--line)"><line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}"/></g>
    <polyline fill="none" stroke="var(--acc)" stroke-width="2.2" points="${pts}"/>
    ${curMarker}
    <g fill="var(--mut)" font-size="11">
      <text x="4" y="${f1(Y(mx - margin) + 4)}">${f1(mx - margin)}</text>
      <text x="4" y="${f1(Y(mn + margin) + 4)}">${f1(mn + margin)}</text>
      <text x="${padL}" y="${H - 8}">Day ${rows[0].mission_day} (Pre)</text>
      <text x="${f1(W / 2)}" y="${H - 8}" text-anchor="middle">Flight (ISS / Lunar / EVA)</text>
      <text x="${W - padR}" y="${H - 8}" text-anchor="end">Day +${rows[rows.length - 1].mission_day} (Post)</text>
    </g>
  </svg>`;
}

async function syncAstronautToMonitor(aid) {
  const rows = getSimDailyRows(aid);
  if (!rows.length) return;
  const profile = SIM_BUNDLE?.astronauts?.find(a => a.astronaut_id === aid);
  if ((E.length || draftDirty) && !await askConfirmation('Load simulated astronaut time-series?', `This replaces saved check-ins with ${rows.length} simulated mission days for ${profile ? profile.name : aid} (from simulate_health_data.py). You can undo this replacement at any time.`, 'Load astronaut mission data')) return;
  const undo = snapshot();
  E = rows.map(r => {
    const m = mapSimRowToRiskMetrics(r);
    return {
      d: r.date,
      hr: Math.round(m.hr),
      sys: Math.round(m.sys),
      dia: Math.round(m.dia),
      spo2: Math.round(m.spo2),
      temp: f1(m.temp),
      sleep: f1(m.sleep),
      ex: Math.round(m.ex / 5) * 5,
      dose: Math.round(r.radiation_dose_mSv_day * 1000),
      co2: m.co2,
      gluc: m.gluc,
      mood: Math.max(1, Math.min(10, Math.round(r.team_cohesion_score + 1.5))),
      stress: Math.max(1, Math.min(10, Math.round((r.cortisol_ug_dL - 10) / 3))),
      fatigue: m.fatigue,
      isol: Math.max(1, Math.min(10, Math.round(9 - r.team_cohesion_score))),
      back: m.back,
      meal: m.meal,
      vision: m.vision,
      head: m.head,
      dizzy: m.dizzy,
      cough: false,
      rash: m.rash,
      gi: m.gi,
      eye: false
    };
  });
  store();
  const curRow = getSimCurrentRow() || rows[rows.length - 1];
  writeSupplementalMetrics(mapSimRowToRiskMetrics(curRow));
  renderOv();
  renderTr();
  renderRisks();
  showToast(`Loaded ${rows.length} simulated days for ${profile ? profile.name : aid} into Monitor.`, undo);
}

async function ensureSimulatedDatasetLoaded() {
  if (SIM_BUNDLE) return SIM_BUNDLE;
  try {
    const res = await fetch('/generated_data/astronaut_health_dataset.json');
    if (!res.ok) return null;
    SIM_BUNDLE = await res.json();
    if (!$('#rk')?.classList.contains('hide')) renderRisks();
    if (!$('#bd')?.classList.contains('hide')) renderBody();
    renderOv();
    return SIM_BUNDLE;
  } catch {
    return null;
  }
}

function jumpToRiskCard(riskKey) {
  riskFilter = 'all';
  tab('rk');
  const card = $(`#rk [data-risk-key="${riskKey}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('risk-card-highlight');
    setTimeout(() => card.classList.remove('risk-card-highlight'), 2400);
  }
}

function buildAmslerGridSvg() {
  const lines = [];
  for (let i = 10; i < 200; i += 10) {
    const sw = i === 100 ? '1.4' : '0.6';
    lines.push(`<line x1="${i}" y1="0" x2="${i}" y2="200" stroke="currentColor" stroke-width="${sw}" opacity="0.65"/>`);
    lines.push(`<line x1="0" y1="${i}" x2="200" y2="${i}" stroke="currentColor" stroke-width="${sw}" opacity="0.65"/>`);
  }
  return `<svg class="amsler-svg" viewBox="0 0 200 200" role="img" aria-label="SANS Near-Vision Amsler Grid with central fixation dot">
    ${lines.join('')}
    <circle cx="100" cy="100" r="4.5" fill="var(--acc)"/>
  </svg>`;
}

const wizardDialog = document.createElement('dialog');
wizardDialog.id = 'measurement-wizard-dialog';
wizardDialog.className = 'wizard-dialog';
wizardDialog.setAttribute('aria-labelledby', 'wizard-dialog-title');
document.body.append(wizardDialog);

let wizardActiveTimer = null;
function clearWizardTimers() {
  if (wizardActiveTimer) {
    clearInterval(wizardActiveTimer);
    clearTimeout(wizardActiveTimer);
    wizardActiveTimer = null;
  }
}
wizardDialog.addEventListener('close', clearWizardTimers);

function openMeasurementWizard(riskKey) {
  clearWizardTimers();
  const risk = SPACE_RISKS_11.find(r => r.key === riskKey) || SPACE_RISKS_11[0];
  const supp = readSupplementalMetrics();
  const activeMetrics = getActiveRiskMetrics(riskScenario);
  const evalSingle = evaluateSpaceRisks(activeMetrics, P().ex).results.find(r => r.key === risk.key);

  let interactiveWidgetHtml = '';
  if (risk.key === 'sensorimotor_vestibular') {
    interactiveWidgetHtml = `
      <div class="wizard-step">
        <h4>Step 2 · Interactive Sit-to-Stand Stopwatch & 10-Step Tandem Walk</h4>
        <p class="sub" style="margin:0">Fold arms across chest. Click <b>Start Timer</b> as you rise from seated/restrained posture, stabilize upright for 2 seconds, then click <b>Stop & Record</b>.</p>
        <div class="wizard-interactive-box">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <span class="wizard-timer-display" id="wiz-sts-display">${f1(supp.sitToStandS)} s</span>
            <div style="display:flex;gap:8px">
              <button type="button" class="pri" id="wiz-sts-toggle">Start Sit-to-Stand Timer</button>
              <button type="button" id="wiz-sts-reset">Reset</button>
            </div>
          </div>
          <div class="f" style="margin-top:6px">
            <label>Sit-to-Stand Time (s · target ≤ 3.3s)
              <input type="number" step="0.1" min="1" max="15" data-wiz-skey="sitToStandS" id="wiz-sts-input" value="${supp.sitToStandS}">
            </label>
            <label>Tandem Walk Correct Steps (0–10 eyes closed)
              <input type="number" step="1" min="0" max="10" id="wiz-tandem-steps" value="${Math.round(supp.tandemWalkPct / 10)}">
            </label>
            <label>Tandem Walk Score (% · target ≥ 72%)
              <input type="number" step="1" min="0" max="100" data-wiz-skey="tandemWalkPct" id="wiz-tandem-pct" value="${supp.tandemWalkPct}">
            </label>
            <label>Motion Sickness Score (0–20 · target ≤ 3)
              <input type="number" step="1" min="0" max="20" data-wiz-skey="motionSickness" value="${supp.motionSickness}">
            </label>
          </div>
        </div>
      </div>
    `;
  } else if (risk.key === 'decompression_sickness' || risk.key === 'eva_injury_performance') {
    const n2Ratio = f1(Math.max(1.0, Math.min(1.88, 1.86 - (supp.o2PrebreatheMin / 225))));
    const dcsIndex = Math.max(2, Math.min(95, Math.round((n2Ratio - 1.05) * 115)));
    interactiveWidgetHtml = `
      <div class="wizard-step">
        <h4>Step 2 · Interactive EVA Denitrogenation & Hand-Grip Calculator</h4>
        <p class="sub" style="margin:0">Adjust 100% O₂ pre-breathe time and post-EVA hand-grip dynamometer values to verify safe decompression and forearm fatigue limits before/after airlock depressurization.</p>
        <div class="wizard-interactive-box">
          <div id="wiz-dcs-live" class="bar l${dcsIndex >= 65 || supp.o2PrebreatheMin < 60 ? 2 : (dcsIndex >= 35 || supp.o2PrebreatheMin < 110 ? 1 : 0)}" style="margin:0">
            Calculated Tissue N₂ Ratio: <b>${n2Ratio}</b> (target &lt; 1.35) · DCS Risk Index: <b>${dcsIndex}/100</b> (target &lt; 35)
          </div>
          <div class="f">
            <label>100% O₂ Pre-Breathe Duration (min · target ≥ 120)
              <input type="number" step="5" min="0" max="240" data-wiz-skey="o2PrebreatheMin" id="wiz-o2-input" value="${supp.o2PrebreatheMin}">
            </label>
            <label>EVA Hand-Grip Fatigue (% · target ≤ 24%)
              <input type="number" step="1" min="0" max="75" data-wiz-skey="gripFatiguePct" value="${supp.gripFatiguePct}">
            </label>
            <label>EVA Musculoskeletal Strain (1–10 · target &lt; 5.2)
              <input type="number" step="0.5" min="0" max="10" data-wiz-skey="evaStrain" value="${supp.evaStrain}">
            </label>
          </div>
        </div>
      </div>
    `;
  } else if (risk.key === 'sans_neuroocular') {
    interactiveWidgetHtml = `
      <div class="wizard-step">
        <h4>Step 2 · Interactive 30 cm Amsler Grid & Ocular Ultrasound ONSD Guide</h4>
        <div class="amsler-wrap">
          ${buildAmslerGridSvg()}
          <div style="flex:1;min-width:220px">
            <p class="sub" style="margin:0 0 8px"><b>Amsler Visual Self-Test:</b> Hold display at 30 cm (12 in), cover one eye, and fixate on the central dot. Check if any grid lines look wavy (metamorphopsia) or missing (scotoma).</p>
            <p class="sub" style="margin:0 0 10px"><b>2D Ocular Ultrasound:</b> Apply sterile gel over closed eyelid; measure Optic Nerve Sheath Diameter (ONSD) 3 mm behind globe.</p>
            <div class="f" style="grid-template-columns:repeat(2,minmax(0,1fr))">
              <label>ONSD Ultrasound (mm · ≤ 5.25)
                <input type="number" step="0.05" min="3.5" max="7.5" data-wiz-skey="onsdMm" value="${supp.onsdMm}">
              </label>
              <label>Refractive Shift (+D · &lt; +0.45)
                <input type="number" step="0.05" min="-0.5" max="2.5" data-wiz-skey="refractiveShift" value="${supp.refractiveShift}">
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (risk.key === 'cardiovascular') {
    interactiveWidgetHtml = `
      <div class="wizard-step">
        <h4>Step 2 · 3-Minute Orthostatic Stand/Tilt ΔHR Calculator & VTE Albumin</h4>
        <p class="sub" style="margin:0">Measure heart rate after 5 min relaxed supine/floating, then after 3 min standing/tethered. Enter both below to auto-compute Orthostatic ΔHR.</p>
        <div class="wizard-interactive-box">
          <div class="f">
            <label>Supine / Floating HR (bpm)
              <input type="number" step="1" min="40" max="130" id="wiz-hr-supine" value="62">
            </label>
            <label>3-Min Standing / Tilt HR (bpm)
              <input type="number" step="1" min="40" max="160" id="wiz-hr-stand" value="${62 + supp.orthoDeltaHr}">
            </label>
            <label>Orthostatic ΔHR (bpm · target ≤ +14)
              <input type="number" step="1" min="0" max="50" data-wiz-skey="orthoDeltaHr" id="wiz-ortho-delta" value="${supp.orthoDeltaHr}">
            </label>
            <label>Serum Albumin (g/dL · target ≥ 3.8)
              <input type="number" step="0.1" min="2.5" max="5.5" data-wiz-skey="albumin" value="${supp.albumin}">
            </label>
          </div>
        </div>
      </div>
    `;
  } else if (risk.key === 'hypoxia') {
    interactiveWidgetHtml = `
      <div class="wizard-step">
        <h4>Step 2 · Psychomotor Vigilance (PVT) Reaction Micro-Test & Cabin ppO₂</h4>
        <p class="sub" style="margin:0">Mild hypoxia and elevated cabin CO₂ slow reaction speed before subjective symptoms appear. Click the pad below to run a quick 3-trial reaction-time check.</p>
        <div class="wizard-interactive-box">
          <div class="pvt-pad" id="wiz-pvt-pad" data-pvt-state="idle" tabindex="0" role="button" aria-label="Psychomotor Vigilance Reaction Test Pad">
            Click here to start 3-Trial PVT Reaction Check
          </div>
          <div class="f">
            <label>Cabin / Suit ppO₂ (kPa · target 19.7–22.5)
              <input type="number" step="0.1" min="14" max="25" data-wiz-skey="cabinPpo2" value="${supp.cabinPpo2}">
            </label>
          </div>
        </div>
      </div>
    `;
  } else {
    const fieldMap = {
      immune_response: [
        ['hs-CRP Inflammation (mg/L · ≤ 2.4)', 'hsCrp', '0.1', '0.1', '15'],
        ['T-Cell Function (% · ≥ 78%)', 'tCellPct', '1', '30', '100']
      ],
      host_microorganism: [
        ['Gut Shannon Diversity (H′ · ≥ 2.95)', 'gutShannon', '0.05', '1.5', '4.5'],
        ['Skin/Nasal Dysbiosis (0–1 · ≤ 0.56)', 'skinDysbiosis', '0.02', '0', '1']
      ],
      nutrition: [
        ['Daily Hydration (L · ≥ 1.9 L)', 'hydrationL', '0.1', '0.5', '5'],
        ['Serum Vitamin D (ng/mL · ≥ 27)', 'vitaminD', '1', '8', '80']
      ],
      fitness_deconditioning: [
        ['IMTP Peak Force Δ (% · ≥ -8.0%)', 'imtpChangePct', '0.5', '-30', '10'],
        ['VO₂max Aerobic Δ (% · ≥ -8.0%)', 'vo2ChangePct', '0.5', '-30', '10']
      ],
      bone_changes: [
        ['Tibial BMD Change (% · ≥ -2.3%)', 'bmdChangePct', '0.1', '-12', '2'],
        ['Serum CTx Resorption (ng/mL · ≤ 0.68)', 'serumCtx', '0.02', '0.1', '1.5']
      ]
    };
    const fields = fieldMap[risk.key] || [];
    interactiveWidgetHtml = `
      <div class="wizard-step">
        <h4>Step 2 · Record Biomarker & Countermeasure Measurements</h4>
        <div class="wizard-interactive-box">
          <div class="f">
            ${fields.map(([lbl, key, stp, mn, mx]) => `
              <label>${esc(lbl)}
                <input type="number" step="${stp}" min="${mn}" max="${mx}" data-wiz-skey="${key}" value="${supp[key]}">
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  wizardDialog.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
      <div>
        <div class="risk-meta">Guided Astronaut Measurement Wizard · Risk #${risk.num}</div>
        <h2 id="wizard-dialog-title" style="margin:4px 0 0">${esc(risk.nameEn)} <span class="pill l${evalSingle ? evalSingle.l : 0}">${LBL[evalSingle ? evalSingle.l : 0]}</span></h2>
      </div>
      <button type="button" id="wiz-close-top" aria-label="Close wizard">Close</button>
    </div>
    <div class="wizard-steps">
      <div class="wizard-step">
        <h4>Step 1 · Why & How to Assess in Spaceflight</h4>
        <p style="margin:0 0 8px;font-size:14px">${esc(risk.desc)}</p>
        <p class="sub" style="margin:0 0 6px"><b>Crew Prompt:</b> ${esc(risk.prompt)}</p>
        <p class="sub" style="margin:0"><b>Standard Protocol:</b> ${esc(risk.measure)}</p>
      </div>
      ${interactiveWidgetHtml}
      <div class="wizard-step">
        <h4>Step 3 · Reference Thresholds & Curated NASA OSDR Evidence</h4>
        <div class="risk-metrics-list">
          ${(evalSingle ? evalSingle.metricsDisplay : []).map(([label, val, ref]) => `
            <div class="risk-metric-item">
              <span>${esc(label)}</span>
              <strong>${esc(val)}</strong>
              <span class="sub">Nominal Target: ${esc(ref)}</span>
            </div>
          `).join('')}
        </div>
        <div class="sub" style="margin-top:8px">
          <b>NASA OSDR Reference Studies:</b> ${risk.studies.map(s => `${esc(s.osd)} (${esc(s.title)})`).join(' · ')}
        </div>
      </div>
    </div>
    <div class="dialog-actions" style="justify-content:space-between;flex-wrap:wrap">
      <span class="sub">Saving applies measurements to Live Monitor & logs +25 XP routine verification.</span>
      <div style="display:flex;gap:10px">
        <button type="button" id="wiz-cancel-btn">Cancel</button>
        <button type="button" class="pri" id="wiz-save-btn">Save Measurements & Verify (+25 XP)</button>
      </div>
    </div>
  `;

  // Wire interactive widgets inside wizard
  const stsToggle = $('#wiz-sts-toggle');
  if (stsToggle) {
    let running = false;
    let startTs = 0;
    stsToggle.onclick = () => {
      const disp = $('#wiz-sts-display');
      const inp = $('#wiz-sts-input');
      if (!running) {
        running = true;
        startTs = performance.now();
        stsToggle.textContent = 'Stop & Record Time';
        wizardActiveTimer = setInterval(() => {
          const elapsed = (performance.now() - startTs) / 1000;
          if (disp) disp.textContent = elapsed.toFixed(2) + ' s';
        }, 40);
      } else {
        running = false;
        clearWizardTimers();
        const finalSec = Math.max(1.0, Math.min(15.0, Math.round(((performance.now() - startTs) / 1000) * 10) / 10));
        if (disp) disp.textContent = finalSec.toFixed(1) + ' s';
        if (inp) inp.value = String(finalSec);
        stsToggle.textContent = 'Start Sit-to-Stand Timer';
      }
    };
    const stsReset = $('#wiz-sts-reset');
    if (stsReset) {
      stsReset.onclick = () => {
        running = false;
        clearWizardTimers();
        stsToggle.textContent = 'Start Sit-to-Stand Timer';
        if ($('#wiz-sts-display')) $('#wiz-sts-display').textContent = '0.0 s';
      };
    }
  }

  const tandemSteps = $('#wiz-tandem-steps');
  if (tandemSteps) {
    tandemSteps.oninput = () => {
      const steps = Math.max(0, Math.min(10, Number(tandemSteps.value) || 0));
      const pctInp = $('#wiz-tandem-pct');
      if (pctInp) pctInp.value = String(steps * 10);
    };
  }

  const o2Input = $('#wiz-o2-input');
  if (o2Input) {
    o2Input.oninput = () => {
      const mins = Math.max(0, Math.min(240, Number(o2Input.value) || 0));
      const n2 = f1(Math.max(1.0, Math.min(1.88, 1.86 - (mins / 225))));
      const dcs = Math.max(2, Math.min(95, Math.round((n2 - 1.05) * 115)));
      const bar = $('#wiz-dcs-live');
      if (bar) {
        const lvl = dcs >= 65 || mins < 60 ? 2 : (dcs >= 35 || mins < 110 ? 1 : 0);
        bar.className = 'bar l' + lvl;
        bar.innerHTML = `Calculated Tissue N₂ Ratio: <b>${n2}</b> (target &lt; 1.35) · DCS Risk Index: <b>${dcs}/100</b> (${LBL[lvl]})`;
      }
    };
  }

  const hrSupine = $('#wiz-hr-supine');
  const hrStand = $('#wiz-hr-stand');
  if (hrSupine && hrStand) {
    const syncOrtho = () => {
      const delta = Math.max(0, (Number(hrStand.value) || 0) - (Number(hrSupine.value) || 0));
      const out = $('#wiz-ortho-delta');
      if (out) out.value = String(delta);
    };
    hrSupine.oninput = syncOrtho;
    hrStand.oninput = syncOrtho;
  }

  const pvtPad = $('#wiz-pvt-pad');
  if (pvtPad) {
    let pvtState = 'idle';
    let goTime = 0;
    let trials = [];
    const runTrial = () => {
      pvtState = 'wait';
      pvtPad.dataset.pvtState = 'wait';
      pvtPad.textContent = `Trial ${trials.length + 1}/3 · Wait for signal…`;
      const delay = 1100 + Math.random() * 1600;
      wizardActiveTimer = setTimeout(() => {
        pvtState = 'go';
        goTime = performance.now();
        pvtPad.dataset.pvtState = 'go';
        pvtPad.textContent = 'SIGNAL ACTIVE — CLICK NOW!';
      }, delay);
    };
    pvtPad.onclick = () => {
      if (pvtState === 'idle' || pvtState === 'done') {
        trials = [];
        runTrial();
      } else if (pvtState === 'wait') {
        clearWizardTimers();
        pvtState = 'idle';
        pvtPad.dataset.pvtState = 'idle';
        pvtPad.textContent = 'Early click! Click to restart 3-Trial PVT Check.';
      } else if (pvtState === 'go') {
        const rt = Math.round(performance.now() - goTime);
        trials.push(rt);
        if (trials.length < 3) {
          runTrial();
        } else {
          pvtState = 'done';
          pvtPad.dataset.pvtState = 'idle';
          const avg = Math.round(trials.reduce((a, b) => a + b, 0) / trials.length);
          const status = avg <= 290 ? 'Nominal Vigilance' : (avg <= 355 ? 'Watch (Mild Slowing)' : 'Act (Lapse / Fatigue Alert)');
          pvtPad.textContent = `PVT Complete: Mean RT ${avg} ms (${trials.join(', ')} ms) · ${status}. Click to re-test.`;
        }
      }
    };
  }

  const closeWizard = () => {
    clearWizardTimers();
    if (wizardDialog.open) wizardDialog.close();
  };
  $('#wiz-close-top').onclick = closeWizard;
  $('#wiz-cancel-btn').onclick = closeWizard;

  $('#wiz-save-btn').onclick = () => {
    const nextSupp = readSupplementalMetrics();
    $$('#measurement-wizard-dialog input[data-wiz-skey]').forEach(inp => {
      const val = parseFloat(inp.value);
      if (Number.isFinite(val)) nextSupp[inp.dataset.wizSkey] = val;
    });
    writeSupplementalMetrics(nextSupp);
    const nextPrompts = readPromptLog();
    nextPrompts[risk.key] = td();
    writePromptLog(nextPrompts);
    riskScenario = 'live';
    setPreference('risk-scenario', 'live');
    closeWizard();
    renderRisks();
    if (!$('#bd')?.classList.contains('hide')) renderBody();
    renderOv();
    showToast(`Saved ${risk.nameEn} measurements & verified daily protocol (+25 XP).`);
  };

  if (!wizardDialog.open) wizardDialog.showModal();
}

function renderRisks() {
  const el = $('#rk');
  if (!el) return;
  const activeMetrics = getActiveRiskMetrics(riskScenario);
  const { results, readiness } = evaluateSpaceRisks(activeMetrics, P().ex);
  const counts = {
    0: results.filter(r => r.l === 0).length,
    1: results.filter(r => r.l === 1).length,
    2: results.filter(r => r.l === 2).length
  };
  const promptLog = readPromptLog();
  const completedPrompts = SPACE_RISKS_11.filter(r => promptLog[r.key]).length;
  const promptXp = completedPrompts * 25;

  const ordered = priorityOrder(results.map(r => r.l)).map(i => results[i]);
  const visible = ordered.filter(r => {
    if (riskFilter === 'flagged') return r.l > 0;
    if (riskFilter === 'eva') return r.cat === 'eva';
    if (riskFilter === 'long') return r.cat === 'long';
    if (riskFilter === 'env') return r.cat === 'env';
    return true;
  });

  const supp = readSupplementalMetrics();
  const topLevel = Math.max(...results.map(r => r.l));
  const simRows = getSimDailyRows(simAstronautId);
  const simRow = getSimCurrentRow();
  const simAstro = SIM_BUNDLE?.astronauts?.find(a => a.astronaut_id === simAstronautId);

  el.innerHTML = `
    <h2>11 NASA Spaceflight Health Risks · Mission Overview</h2>
    <p class="sub">Complete risk monitoring for all 11 spaceflight risks defined in the NASA Space Challenge, with color-coded thresholds, guided astronaut measurement prompts, longitudinal simulation time-series (<code>simulate_health_data.py</code>), mission-site context (${esc(P().n)}, ${esc(P().g)}), and curated NASA OSDR studies.</p>
    <div class="bar l${topLevel}" style="margin-top:12px">
      11-Risk Mission Readiness: ${readiness}/100 (${LBL[topLevel]}) · ${counts[2]} Act (Red), ${counts[1]} Watch (Yellow), ${counts[0]} Normal (Green) · Routine Prompts Verified: ${completedPrompts}/11 (+${promptXp} XP)
    </div>
    <div class="risk-toolbar">
      <label class="mission-label" style="flex:1;min-width:240px">
        Assessment data source / Crew profile
        <select id="risk-scenario-select" aria-label="Assessment data source or crew profile">
          <option value="sim" ${riskScenario === 'sim' ? 'selected' : ''}>Simulated Mission Time-Series (simulate_health_data.py · 148 days)</option>
          <option value="live" ${riskScenario === 'live' ? 'selected' : ''}>Live Monitor Check-in + Supplemental Inputs</option>
          <option value="ast01" ${riskScenario === 'ast01' ? 'selected' : ''}>${esc(CREW_SCENARIOS.ast01.label)}</option>
          <option value="ast02" ${riskScenario === 'ast02' ? 'selected' : ''}>${esc(CREW_SCENARIOS.ast02.label)}</option>
          <option value="ast03" ${riskScenario === 'ast03' ? 'selected' : ''}>${esc(CREW_SCENARIOS.ast03.label)}</option>
          <option value="nominal" ${riskScenario === 'nominal' ? 'selected' : ''}>${esc(CREW_SCENARIOS.nominal.label)}</option>
        </select>
      </label>
      <div class="task-filters" role="group" aria-label="Filter 11 spaceflight risks" style="margin:0">
        ${[
          ['all', `All 11 risks (11)`],
          ['flagged', `Act / Watch (${counts[1] + counts[2]})`],
          ['eva', 'EVA & Surface (3)'],
          ['long', 'Microgravity & Long-term (5)'],
          ['env', 'Environment & Immune (3)']
        ].map(([val, label]) => `<button type="button" data-rfilter="${val}" aria-pressed="${riskFilter === val}">${label}</button>`).join('')}
      </div>
    </div>

    <div class="wizard-quick-bar" role="group" aria-label="Interactive Guided Astronaut Field-Test Wizards">
      <strong style="font-size:13px">Interactive Guided Field-Test Wizards:</strong>
      <button type="button" class="pri" data-open-wizard="sensorimotor_vestibular">Sit-to-Stand Stopwatch & Balance (Risk #2)</button>
      <button type="button" class="pri" data-open-wizard="sans_neuroocular">SANS Amsler Grid & ONSD Ultrasound (Risk #10)</button>
      <button type="button" class="pri" data-open-wizard="decompression_sickness">EVA O₂ Pre-Breathe & DCS Calculator (Risk #4)</button>
      <button type="button" data-open-wizard="cardiovascular">Orthostatic ΔHR & VTE Check (Risk #3)</button>
      <button type="button" data-open-wizard="hypoxia">3-Trial PVT Vigilance & Hypoxia (Risk #6)</button>
    </div>

    ${SIM_BUNDLE ? `
      <div class="sim-explorer-panel" aria-label="Simulated Mission Time-Series Explorer">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:start;gap:12px">
          <div>
            <h3 style="margin:0;font-size:16px">Longitudinal Mission Simulator (<code>simulate_health_data.py</code> · ${simRows.length} Days)</h3>
            <p class="sub" style="margin:4px 0 0">
              ${simAstro ? `<b>${esc(simAstro.name)}</b> (${esc(simAstro.role)})` : esc(simAstronautId)}
              ${simRow ? ` · <b>Day ${simRow.mission_day}</b> (${esc(simRow.date)}) · Environment: <b>${esc(simRow.environment)}</b> (${simRow.gravity_g}g, ${esc(simRow.mission_phase)}) · XP: <b>${simRow.gamification?.total_xp || 0}</b> (${esc(simRow.gamification?.badge_level || '')})` : ''}
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" id="sync-sim-to-monitor" class="pri">Load ${esc(simAstronautId)} (148 days) into Monitor</button>
            <a href="/research?sim=daily_health_metrics" target="_top" class="research-shortcut" style="min-height:38px;padding:6px 12px;font-size:13px">Analyze in Research Workspace</a>
          </div>
        </div>
        <div class="f" style="margin-top:12px">
          <label>Simulated Astronaut
            <select id="sim-astro-select" aria-label="Simulated Astronaut">
              ${SIM_BUNDLE.astronauts.map(a => `<option value="${esc(a.astronaut_id)}" ${a.astronaut_id === simAstronautId ? 'selected' : ''}>${esc(a.astronaut_id)} · ${esc(a.name)} (${esc(a.role)})</option>`).join('')}
            </select>
          </label>
          <label>Mission Day Timeline (L-14 to R+14): <b id="sim-day-label">Day ${simMissionDay}</b>
            <input type="range" id="sim-day-slider" min="-14" max="133" step="1" value="${simMissionDay}">
          </label>
          <label>Dynamic Longitudinal Chart Indicator
            <select id="sim-metric-select" aria-label="Dynamic Longitudinal Chart Indicator">
              ${SIM_CHART_METRICS.map(([k, lbl]) => `<option value="${k}" ${simChartMetric === k ? 'selected' : ''}>${esc(lbl)}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="sim-milestone-bar" role="group" aria-label="Jump to mission anomaly events">
          <span class="sub" style="align-self:center;margin-right:4px">Jump to event:</span>
          <button type="button" data-simjump="AST-01:-7">Pre-Flight Baseline (Day -7)</button>
          <button type="button" data-simjump="AST-01:1">Launch 0G Transition (Day 1)</button>
          <button type="button" data-simjump="AST-02:36">AST-02 VTE / Low Albumin Alert (Day 36)</button>
          <button type="button" data-simjump="AST-02:56">Cabin Hypoxia & CO₂ Spike (Day 56)</button>
          <button type="button" data-simjump="AST-01:82">AST-01 SANS Ocular Alert (Day 82)</button>
          <button type="button" data-simjump="AST-03:93">AST-03 Surface EVA DCS & Thermal Strain (Day 93)</button>
          <button type="button" data-simjump="AST-03:120">R+0 Earth Landing Gravity Reload (Day 120)</button>
        </div>
        <div style="margin-top:12px" class="scroll">
          ${buildSimLongitudinalSvg(simRows, simChartMetric, simMissionDay)}
        </div>
      </div>
    ` : ''}

    <details class="risk-inputs-panel">
      <summary>Supplemental Spaceflight & EVA Indicators (${riskScenario === 'live' ? 'Editable for Live Monitor mode' : 'Viewing scenario / simulation — click Apply to switch to custom Live Monitor'})</summary>
      <p class="sub" style="margin:8px 0 14px">Adjust specialized indicators (DCS O₂ pre-breathe, EVA hand-grip fatigue, vestibular Sit-to-Stand, SANS ONSD ultrasound, microbiome diversity, and bone turnover) to evaluate all 11 risks without altering your saved daily check-in log.</p>
      <div class="f">
        <label>hs-CRP inflammation (mg/L)<input type="number" step="0.1" min="0.1" max="15" data-skey="hsCrp" value="${supp.hsCrp}"></label>
        <label>T-cell function (%)<input type="number" step="1" min="30" max="100" data-skey="tCellPct" value="${supp.tCellPct}"></label>
        <label>Sit-to-Stand time (s)<input type="number" step="0.1" min="1" max="10" data-skey="sitToStandS" value="${supp.sitToStandS}"></label>
        <label>Tandem walk eyes closed (%)<input type="number" step="1" min="0" max="100" data-skey="tandemWalkPct" value="${supp.tandemWalkPct}"></label>
        <label>Motion sickness (0–20)<input type="number" step="1" min="0" max="20" data-skey="motionSickness" value="${supp.motionSickness}"></label>
        <label>Orthostatic ΔHR (bpm)<input type="number" step="1" min="0" max="40" data-skey="orthoDeltaHr" value="${supp.orthoDeltaHr}"></label>
        <label>Serum albumin (g/dL)<input type="number" step="0.1" min="2.5" max="5.5" data-skey="albumin" value="${supp.albumin}"></label>
        <label>EVA O₂ pre-breathe (min)<input type="number" step="5" min="0" max="240" data-skey="o2PrebreatheMin" value="${supp.o2PrebreatheMin}"></label>
        <label>Gut Shannon diversity (H′)<input type="number" step="0.05" min="1.5" max="4.5" data-skey="gutShannon" value="${supp.gutShannon}"></label>
        <label>Skin/nasal dysbiosis (0–1)<input type="number" step="0.02" min="0" max="1" data-skey="skinDysbiosis" value="${supp.skinDysbiosis}"></label>
        <label>Cabin/suit ppO₂ (kPa)<input type="number" step="0.1" min="14" max="25" data-skey="cabinPpo2" value="${supp.cabinPpo2}"></label>
        <label>Daily hydration (L)<input type="number" step="0.1" min="0.5" max="5" data-skey="hydrationL" value="${supp.hydrationL}"></label>
        <label>Serum Vitamin D (ng/mL)<input type="number" step="1" min="8" max="80" data-skey="vitaminD" value="${supp.vitaminD}"></label>
        <label>EVA hand-grip fatigue (%)<input type="number" step="1" min="0" max="70" data-skey="gripFatiguePct" value="${supp.gripFatiguePct}"></label>
        <label>EVA strain score (1–10)<input type="number" step="0.5" min="0" max="10" data-skey="evaStrain" value="${supp.evaStrain}"></label>
        <label>IMTP force change (%)<input type="number" step="0.5" min="-30" max="10" data-skey="imtpChangePct" value="${supp.imtpChangePct}"></label>
        <label>VO₂max change (%)<input type="number" step="0.5" min="-30" max="10" data-skey="vo2ChangePct" value="${supp.vo2ChangePct}"></label>
        <label>ONSD ocular ultrasound (mm)<input type="number" step="0.05" min="3.5" max="7.0" data-skey="onsdMm" value="${supp.onsdMm}"></label>
        <label>Refractive shift (D)<input type="number" step="0.05" min="-0.5" max="2.0" data-skey="refractiveShift" value="${supp.refractiveShift}"></label>
        <label>Tibia BMD change (%)<input type="number" step="0.1" min="-12" max="2" data-skey="bmdChangePct" value="${supp.bmdChangePct}"></label>
        <label>Serum CTx resorption (ng/mL)<input type="number" step="0.02" min="0.1" max="1.5" data-skey="serumCtx" value="${supp.serumCtx}"></label>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
        <button type="button" id="apply-supp-metrics" class="pri">Apply supplemental indicators</button>
        <button type="button" id="reset-supp-metrics">Reset to nominal defaults</button>
      </div>
    </details>

    <div class="grid" id="risk-cards-grid">
      ${visible.map(r => `
        <article class="card risk-card" data-risk-key="${r.key}">
          <div>
            <div class="risk-meta">Risk #${r.num} · ${esc(r.nameDe)}</div>
            <h2>${esc(r.nameEn)}<span class="pill l${r.l}">${LBL[r.l]}</span></h2>
          </div>
          <p class="sub" style="margin:0">${esc(r.desc)}</p>
          <div class="risk-metrics-list" aria-label="Indicators for ${esc(r.nameEn)}">
            ${r.metricsDisplay.map(([label, val, ref]) => `
              <div class="risk-metric-item">
                <span>${esc(label)}</span>
                <strong>${esc(val)}</strong>
                <span class="sub">Target: ${esc(ref)}</span>
              </div>
            `).join('')}
          </div>
          ${r.reasons.length ? `<ul>${r.reasons.map(reason => `<li><strong>${esc(reason)}</strong></li>`).join('')}</ul>` : `<div class="sub">All indicators within nominal spaceflight target range.</div>`}
          <div class="risk-prompt-box">
            <label style="display:flex;gap:8px;align-items:start;cursor:pointer">
              <input type="checkbox" data-rprompt="${r.key}" ${promptLog[r.key] ? 'checked' : ''}>
              <span>
                <strong>Guided Measurement Prompt (+25 XP):</strong> ${esc(r.prompt)}
                <span class="sub" style="display:block;margin-top:4px"><b>How to assess:</b> ${esc(r.measure)}</span>
              </span>
            </label>
            <div style="margin-top:8px">
              <button type="button" class="pri" data-open-wizard="${r.key}" style="min-height:36px;padding:6px 12px;font-size:12px">Launch Step-by-Step Measurement Wizard</button>
            </div>
          </div>
          ${r.l > 0 ? `
            <div class="act">
              <b>Recommended Countermeasures (${LBL[r.l]})</b>
              <ul>
                ${(r.l === 2 ? r.act2 : r.act1).map(step => `<li>${esc(step)}</li>`).join('')}
                ${r.l === 2 ? `<li><b>${esc(P().cm)}</b></li>` : ''}
              </ul>
            </div>
          ` : ''}
          <details class="risk-osdr-box">
            <summary>NASA OSDR Reference Studies & Standard Measures (${r.studies.length})</summary>
            ${r.studies.map(s => `
              <div class="osdr-study-item">
                <div><strong>${esc(s.osd)}</strong> · ${esc(s.title)}</div>
                <div class="sub">Biomarkers / Metrics: ${esc(s.metrics)}</div>
                <div class="sub">Standard Measures: ${esc(s.std)}</div>
                <div class="osdr-study-actions">
                  <a href="/research?osd=${encodeURIComponent(s.osd)}&risk=${r.num}" target="_top">Analyze ${esc(s.osd)} in Research Workspace</a>
                  <a href="https://osdr.nasa.gov/bio/repo/data/studies/${encodeURIComponent(s.osd)}" target="_blank" rel="noopener">NASA OSDR Repository</a>
                </div>
              </div>
            `).join('')}
          </details>
        </article>
      `).join('')}
    </div>
  `;

  $('#risk-scenario-select').onchange = ev => {
    riskScenario = ev.target.value;
    setPreference('risk-scenario', riskScenario);
    renderRisks();
    renderOv();
  };

  const astroSel = $('#sim-astro-select');
  if (astroSel) {
    astroSel.onchange = ev => {
      simAstronautId = ev.target.value;
      riskScenario = 'sim';
      setPreference('sim-astronaut', simAstronautId);
      setPreference('risk-scenario', 'sim');
      renderRisks();
      renderOv();
    };
  }

  const daySlider = $('#sim-day-slider');
  if (daySlider) {
    daySlider.oninput = ev => {
      const lbl = $('#sim-day-label');
      if (lbl) lbl.textContent = 'Day ' + ev.target.value;
    };
    daySlider.onchange = ev => {
      simMissionDay = Number(ev.target.value);
      riskScenario = 'sim';
      setPreference('sim-day', String(simMissionDay));
      setPreference('risk-scenario', 'sim');
      renderRisks();
      renderOv();
    };
  }

  const metricSel = $('#sim-metric-select');
  if (metricSel) {
    metricSel.onchange = ev => {
      simChartMetric = ev.target.value;
      setPreference('sim-metric', simChartMetric);
      renderRisks();
    };
  }

  $$('#rk button[data-simjump]').forEach(btn => {
    btn.onclick = () => {
      const [aid, dayStr] = btn.dataset.simjump.split(':');
      simAstronautId = aid;
      simMissionDay = Number(dayStr);
      riskScenario = 'sim';
      setPreference('sim-astronaut', simAstronautId);
      setPreference('sim-day', String(simMissionDay));
      setPreference('risk-scenario', 'sim');
      renderRisks();
      renderOv();
    };
  });

  const syncBtn = $('#sync-sim-to-monitor');
  if (syncBtn) {
    syncBtn.onclick = () => void syncAstronautToMonitor(simAstronautId);
  }

  $$('#rk button[data-rfilter]').forEach(btn => {
    btn.onclick = () => {
      riskFilter = btn.dataset.rfilter;
      renderRisks();
      $(`#rk button[data-rfilter="${riskFilter}"]`)?.focus();
    };
  });

  $$('#rk input[data-rprompt]').forEach(chk => {
    chk.onchange = () => {
      const next = readPromptLog();
      if (chk.checked) next[chk.dataset.rprompt] = td();
      else delete next[chk.dataset.rprompt];
      writePromptLog(next);
      const riskObj = SPACE_RISKS_11.find(item => item.key === chk.dataset.rprompt);
      showToast((chk.checked ? 'Verified protocol (+25 XP): ' : 'Reopened protocol: ') + (riskObj ? riskObj.nameEn : chk.dataset.rprompt));
      renderRisks();
    };
  });

  $$('#rk button[data-open-wizard]').forEach(btn => {
    btn.onclick = () => openMeasurementWizard(btn.dataset.openWizard);
  });

  const applyBtn = $('#apply-supp-metrics');
  if (applyBtn) {
    applyBtn.onclick = () => {
      const next = readSupplementalMetrics();
      $$('#rk input[data-skey]').forEach(inp => {
        const val = parseFloat(inp.value);
        if (Number.isFinite(val)) next[inp.dataset.skey] = val;
      });
      writeSupplementalMetrics(next);
      riskScenario = 'live';
      setPreference('risk-scenario', 'live');
      renderRisks();
      renderOv();
      showToast('Supplemental spaceflight indicators updated for Live Monitor evaluation.');
    };
  }

  const resetBtn = $('#reset-supp-metrics');
  if (resetBtn) {
    resetBtn.onclick = () => {
      writeSupplementalMetrics(DEFAULT_SUPP_METRICS);
      riskScenario = 'live';
      setPreference('risk-scenario', 'live');
      renderRisks();
      renderOv();
      showToast('Supplemental indicators reset to nominal baseline values.');
    };
  }
}

const baseEnhancedOverview = renderOv;
renderOv = function() {
  baseEnhancedOverview();
  const ovEl = $('#ov');
  if (!ovEl) return;
  const activeMetrics = getActiveRiskMetrics(riskScenario);
  const { results, readiness } = evaluateSpaceRisks(activeMetrics, P().ex);
  const actCount = results.filter(r => r.l === 2).length;
  const watchCount = results.filter(r => r.l === 1).length;
  const topRiskLevel = Math.max(...results.map(r => r.l));
  const banner = document.createElement('div');
  banner.className = `card ov-risk-banner l${topRiskLevel}`;
  const modeLabel = riskScenario === 'sim' ? `Simulated Mission (${simAstronautId} · Day ${simMissionDay})` : (riskScenario === 'live' ? 'Live Monitor' : CREW_SCENARIOS[riskScenario]?.label || 'Crew Profile');
  banner.innerHTML = `
    <div>
      <strong>11 NASA Spaceflight Risks Matrix (${esc(modeLabel)})</strong>
      <div class="sub" style="color:inherit">Readiness Score: <b>${readiness}/100</b> · ${actCount} Act, ${watchCount} Watch, ${11 - actCount - watchCount} Normal across all 11 challenge risks (incl. DCS, Microbiome, EVA, Sensorimotor, SANS & Bone).</div>
    </div>
    <button type="button" class="pri" id="open-11-risks-btn">Open 11 Risks Matrix</button>
  `;
  const firstGrid = $('#ov > .grid');
  if (firstGrid) firstGrid.before(banner);
  else ovEl.append(banner);
  const openBtn = $('#open-11-risks-btn');
  if (openBtn) openBtn.onclick = () => tab('rk');
};

const baseRenderHz = renderHz;
renderHz = function() {
  baseRenderHz();
  const hzEl = $('#hz');
  if (!hzEl) return;
  const callout = document.createElement('div');
  callout.className = 'card';
  callout.style.marginTop = '12px';
  callout.innerHTML = `
    <h2>Complete 11 Spaceflight Risks Assessment & NASA OSDR Mapping</h2>
    <p class="sub">All 11 spaceflight risks from the NASA Space Challenge — including Decompression Sickness (DCS), Host-Microorganism Interactions, Spacewalk (EVA) Injuries, Sensorimotor/Vestibular Adaptation, Hypoxia, SANS, and Bone Remodeling — are interactively monitored with guided prompts, longitudinal simulation data (<code>simulate_health_data.py</code>), and 20 curated NASA OSDR studies in the dedicated 11 Risks view.</p>
    <button type="button" class="pri" id="hz-to-rk-btn">Open 11 Spaceflight Risks</button>
  `;
  hzEl.append(callout);
  const btn = $('#hz-to-rk-btn');
  if (btn) btn.onclick = () => tab('rk');
};

const baseEnhancedBody = renderBody;
renderBody = function() {
  baseEnhancedBody();
  const bpEl = $('#bp');
  if (!bpEl) return;
  bpEl.querySelector('.anatomy-risks-panel')?.remove();
  const mappedKeys = BODY_REGION_TO_RISKS[SEL] || [];
  if (!mappedKeys.length) return;
  const activeMetrics = getActiveRiskMetrics(riskScenario);
  const { results } = evaluateSpaceRisks(activeMetrics, P().ex);
  const promptLog = readPromptLog();
  const mappedRisks = mappedKeys.map(k => results.find(r => r.key === k)).filter(Boolean);
  const modeLabel = riskScenario === 'sim' ? `Simulated Mission (${simAstronautId} · Day ${simMissionDay})` : (riskScenario === 'live' ? 'Live Monitor' : CREW_SCENARIOS[riskScenario]?.label || 'Crew Profile');

  const panel = document.createElement('div');
  panel.className = 'anatomy-risks-panel';
  panel.innerHTML = `
    <div>
      <h3>Mapped NASA Spaceflight Risks & Biomarkers (${mappedRisks.length})</h3>
      <p class="sub" style="margin:2px 0 0">Region-linked risks from the 11 Spaceflight Risks (${esc(modeLabel)})</p>
    </div>
    ${mappedRisks.map(r => `
      <div class="anatomy-risk-item">
        <div class="anatomy-risk-head">
          <div>
            <div class="risk-meta">Risk #${r.num} · ${esc(r.nameDe)}</div>
            <strong style="font-size:14px">${esc(r.nameEn)}</strong>
          </div>
          <span class="pill l${r.l}">${LBL[r.l]}</span>
        </div>
        <div class="risk-metrics-list">
          ${r.metricsDisplay.map(([label, val, ref]) => `
            <div class="risk-metric-item">
              <span>${esc(label)}</span>
              <strong>${esc(val)}</strong>
              <span class="sub">Target: ${esc(ref)}</span>
            </div>
          `).join('')}
        </div>
        ${r.reasons.length ? `<div class="sub" style="color:var(--warn)"><b>Alert:</b> ${esc(r.reasons[0])}</div>` : `<div class="sub">All region biomarkers within nominal target range.</div>`}
        <div class="sub"><b>Guided Protocol (${promptLog[r.key] ? 'Verified +25 XP' : 'Pending'}):</b> ${esc(r.prompt)}</div>
        <div class="anatomy-risk-actions">
          <button type="button" class="pri" data-body-wizard="${r.key}">Guided Measurement Wizard</button>
          <button type="button" data-body-jump="${r.key}">Inspect Risk #${r.num} in 11 Risks</button>
        </div>
      </div>
    `).join('')}
  `;
  bpEl.append(panel);

  $$('#bp button[data-body-wizard]').forEach(btn => {
    btn.onclick = () => openMeasurementWizard(btn.dataset.bodyWizard);
  });
  $$('#bp button[data-body-jump]').forEach(btn => {
    btn.onclick = () => jumpToRiskCard(btn.dataset.bodyJump);
  });
};

const prevTab = tab;
tab = function(id, moveFocus = true) {
  $('#rk')?.classList.toggle('hide', id !== 'rk');
  prevTab(id, moveFocus);
  if (id === 'rk') renderRisks();
};

const origProfChange = $('#prof').onchange;
$('#prof').onchange = e => {
  if (origProfChange) origProfChange(e);
  if (!$('#rk')?.classList.contains('hide')) renderRisks();
};

renderOv();
void ensureSimulatedDatasetLoaded();
