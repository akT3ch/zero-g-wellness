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
const undoButton = document.createElement('button');
undoButton.textContent = 'Undo'; undoButton.hidden = true;
const toastActions = document.createElement('div');
toastActions.className = 'toast-actions';
toastActions.append(undoButton, $('#tx')); $('#toast').append(toastActions);
showToast = function(message, undo) {
  $('#tt').textContent = message;
  $('#toast').className = 'bar ' + (message.startsWith('Due:') ? 'l1' : 'l0');
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
window.addEventListener('beforeunload', event => { if (draftDirty) { event.preventDefault(); event.returnValue = ''; } });
function validateCheckIn() {
  const fields = [$('#n_d'), ...NUM.map(item => $('#n_' + item[0]))];
  fields.forEach(field => field.removeAttribute('aria-invalid'));
  const invalid = fields.find(field => !field.checkValidity());
  const error = $('#form-error');
  if (!invalid) { error.classList.add('hide'); return true; }
  invalid.setAttribute('aria-invalid', 'true');
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
  $('#draft-state').textContent = 'All changes saved';
  NUM.forEach(item => { $('#n_' + item[0]).parentElement.querySelector('.field-status').textContent = 'Suggested · not measured'; });
  showToast('Check-in saved for ' + date + '.', undo);
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
    dvs('Import not completed. Use a CSV with a date column and a measurement column such as hr or sleep.'); event.target.value = ''; return;
  }
  const dates = lines.slice(1).filter(line => line.trim()).map(line => line.split(/[;,]/)[dateIndex]?.slice(0,10));
  if (dates.some(date => !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) {
    dvs('Import not completed. Every row needs a valid date in YYYY-MM-DD format.'); event.target.value = ''; return;
  }
  if (dates.some(date => E.some(entry => entry.d === date)) && !await askConfirmation('Replace matching entries?', 'This file contains dates already in your log. Importing replaces those entries. You can undo the import.', 'Import and replace')) { event.target.value = ''; return; }
  const undo = snapshot(); $('#b_csv').disabled = true; $('#b_csv').textContent = 'Importing…';
  try { await originalImport(event); showToast('Imported ' + new Set(dates).size + ' days from CSV.', undo); }
  catch { dvs('Import failed. Check the CSV format and try again.'); undo(); }
  finally { $('#b_csv').disabled = false; $('#b_csv').textContent = 'Import CSV'; }
};
tab = function(id, moveFocus = true) {
  originalTab(id);
  $$('.skip-link').forEach(link => link.href = '#' + id);
  $$('nav button').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.t === id)); button.tabIndex = button.dataset.t === id ? 0 : -1; });
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
  $('#chart').insertAdjacentHTML('beforeend','<details class="trend-data"><summary>Measurement history (' + entries.length + ' entries)</summary><table><caption>' + esc(NAMES[key]) + '</caption><thead><tr><th scope="col">Date</th><th scope="col">Value</th></tr></thead><tbody>' + entries.map(entry => '<tr><td>' + esc(entry.d) + '</td><td>' + esc(entry[key]) + '</td></tr>').join('') + '</tbody></table></details>');
  $('#met').onchange = renderTr;
};
renderTk = function() {
  originalTasks();
  $$('#tk input[data-k]').forEach(input => {
    input.parentElement.setAttribute('data-task', input.dataset.k);
    const handler = input.onchange;
    if (!handler) return;
    input.onchange = () => { const completed = input.checked; const task = TASKS.find(task => task.id === input.dataset.k); handler(); showToast((completed ? 'Completed: ' : 'Reopened: ') + task.n); $('#tk input[data-k="' + task.id + '"]').focus(); };
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
    paragraphs[0].textContent = 'Unavailable live sources are not included in the assessment. Sample cabin readings are labeled and do not generate warnings.';
  }
  if (ENV.src === 'none') $('#env .src').setAttribute('aria-busy','true');
  $('#env').classList.toggle('hide', !$('nav button[data-t="ov"]').classList.contains('on') && !$('nav button[data-t="hz"]').classList.contains('on'));
};
const enhancedTab = tab;
tab = function(id, moveFocus = true) { enhancedTab(id, moveFocus); $('#env').classList.toggle('hide', id !== 'ov' && id !== 'hz'); };
$$('#bsvg .rg').forEach(region => {
  const original = region.onclick;
  region.onclick = () => { original(); $$('#bsvg .rg').forEach(item => item.setAttribute('aria-pressed',String(item.dataset.r === SEL))); };
  region.setAttribute('aria-pressed',String(region.dataset.r === SEL));
});
$('#dvs').setAttribute('role','status');
$('#met').setAttribute('aria-label','Trend measurement');
$('#b_hr').textContent = 'Connect pulse monitor'; $('#b_bp').textContent = 'Connect blood pressure monitor';
$('#b_ox').textContent = 'Connect oxygen monitor'; $('#b_t').textContent = 'Connect thermometer';
const originalSample = onSample;
onSample = function(key, value, source) { originalSample(key, value, source); if (SRC[key]) updateDraft(); };
// Keep remote source values and medical evaluation unchanged, including uncertain telemetry.
renderEnv(); tab('ov', false);

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