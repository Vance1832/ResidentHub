/* ============================================================
   maintenance.js – Maintenance request tracker
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  init();
});

let searchQuery    = '';
let filterStatus   = '';
let filterPriority = '';
let filterCategory = '';
let sortOrder      = 'newest';
const PW = { high: 3, medium: 2, low: 1 };

function init() {
  renderSummary();
  updateTabCounts();
  renderTable();
  wireToolbar();
  wireModal();
  document.getElementById('btn-add-maint')?.addEventListener('click', openAdd);
  document.getElementById('btn-save-maint')?.addEventListener('click', save);
  document.getElementById('maint-resident')?.addEventListener('change', onResidentChange);
}

// ── Summary Bar ───────────────────────────────────────────────

function renderSummary() {
  const bar = document.getElementById('maint-summary-bar');
  if (!bar) return;
  const all  = MaintenanceStorage.getAll();
  const pen  = all.filter(m => m.status === 'pending').length;
  const inp  = all.filter(m => m.status === 'in-progress').length;
  const done = all.filter(m => m.status === 'completed').length;

  bar.innerHTML = `
    <div class="maint-count-card">
      <div><div class="maint-count-num">${all.length}</div><div class="maint-count-label">Total</div></div>
      <div class="maint-count-divider"></div>
      <div><div class="maint-count-num" style="color:var(--amber);">${pen}</div><div class="maint-count-label">Pending</div></div>
      <div class="maint-count-divider"></div>
      <div><div class="maint-count-num" style="color:var(--blue);">${inp}</div><div class="maint-count-label">In Progress</div></div>
      <div class="maint-count-divider"></div>
      <div><div class="maint-count-num" style="color:var(--green);">${done}</div><div class="maint-count-label">Completed</div></div>
    </div>`;
}

function updateTabCounts() {
  const all  = MaintenanceStorage.getAll();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('tab-count-all',        all.length);
  set('tab-count-pending',    all.filter(m => m.status === 'pending').length);
  set('tab-count-inprogress', all.filter(m => m.status === 'in-progress').length);
  set('tab-count-completed',  all.filter(m => m.status === 'completed').length);
}

// ── Filtered list ─────────────────────────────────────────────

function getList() {
  let list = MaintenanceStorage.getAll();
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(m =>
      m.residentName.toLowerCase().includes(q) ||
      m.roomNumber.toLowerCase().includes(q)    ||
      m.category.toLowerCase().includes(q)      ||
      m.description.toLowerCase().includes(q)
    );
  }
  if (filterStatus)   list = list.filter(m => m.status   === filterStatus);
  if (filterPriority) list = list.filter(m => m.priority === filterPriority);
  if (filterCategory) list = list.filter(m => m.category === filterCategory);
  switch (sortOrder) {
    case 'newest':        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'oldest':        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'priority-high': list.sort((a, b) => (PW[b.priority] || 0) - (PW[a.priority] || 0)); break;
    case 'priority-low':  list.sort((a, b) => (PW[a.priority] || 0) - (PW[b.priority] || 0)); break;
  }
  return list;
}

// ── Render table ──────────────────────────────────────────────

function renderTable() {
  const tbody = document.getElementById('maint-tbody');
  const label = document.getElementById('maint-count-label');
  const show  = document.getElementById('maint-showing-label');
  if (!tbody) return;

  const list  = getList();
  const total = MaintenanceStorage.getAll().length;
  const isF   = searchQuery || filterStatus || filterPriority || filterCategory;

  if (label) label.textContent = `${total} request${total !== 1 ? 's' : ''} total`;
  if (show)  show.textContent  = isF ? `${list.length} of ${total} shown` : '';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8">${emptyHtml('<path d="M9.5 3.5a3 3 0 0 1-4 4L2 11a2 2 0 1 0 3 3l3.5-3.5a3 3 0 0 1 4-4l-2 2 1.5 1.5 2-2z"/>', 'No requests found', isF ? 'Try adjusting filters.' : 'No maintenance requests submitted yet.')}</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(m => `
    <tr>
      <td style="padding-left:var(--s5);width:20px;">
        <span class="priority-dot ${m.priority}" title="${capitalize(m.priority)} priority"></span>
      </td>
      <td>
        <div style="font-weight:500;font-size:12px;">${escapeHtml(m.residentName)}</div>
      </td>
      <td>
        <span class="mono" style="font-size:11px;background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:1px 5px;">${escapeHtml(m.roomNumber)}</span>
      </td>
      <td style="font-size:11px;color:var(--text-2);">${escapeHtml(m.category)}</td>
      <td>
        <div class="ticket-desc">${escapeHtml(m.description)}</div>
      </td>
      <td>${maintStatusBadge(m.status)}</td>
      <td style="font-size:11px;color:var(--text-3);white-space:nowrap;">${timeAgo(m.createdAt)}</td>
      <td>
        <div class="td-actions-right">
          ${m.status !== 'completed'
            ? `<button class="btn btn-ghost btn-sm" onclick="advance('${m.id}')">${m.status === 'pending' ? 'Start' : 'Complete'}</button>`
            : ''
          }
          <button class="btn btn-ghost btn-sm" onclick="openEdit('${m.id}')">Edit</button>
          <button class="icon-btn" onclick="del('${m.id}')">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l1 9.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5L13 4"/></svg>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

function advance(id) {
  const m = MaintenanceStorage.getById(id);
  if (!m) return;
  const next   = m.status === 'pending' ? 'in-progress' : 'completed';
  const labels = { 'in-progress': 'In Progress', completed: 'Completed' };
  MaintenanceStorage.update(id, { status: next });
  ActivityStorage.add('maintenance', `Request by <strong>${escapeHtml(m.residentName)}</strong> → <strong>${labels[next]}</strong>`, next === 'completed' ? 'green' : 'blue');
  showToast(`Marked as ${labels[next]}.`);
  refresh();
}

function refresh() { renderSummary(); updateTabCounts(); renderTable(); }

// ── Toolbar ───────────────────────────────────────────────────

function wireToolbar() {
  document.getElementById('search-maint')?.addEventListener('input', debounce(e => {
    searchQuery = e.target.value.trim(); renderTable();
  }));
  document.getElementById('filter-priority')?.addEventListener('change', e => { filterPriority = e.target.value; renderTable(); });
  document.getElementById('filter-category')?.addEventListener('change', e => { filterCategory = e.target.value; renderTable(); });
  document.getElementById('sort-maint')?.addEventListener('change',      e => { sortOrder      = e.target.value; renderTable(); });

  // Status tabs
  document.getElementById('status-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('.status-tab');
    if (!tab) return;
    document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filterStatus = tab.dataset.status;
    renderTable();
  });
}

// ── Modal ─────────────────────────────────────────────────────

function wireModal() {
  const ov = document.getElementById('maint-modal');
  if (ov) wireModalClose(ov);
}

function fillResidentSelect(selected = '') {
  const sel = document.getElementById('maint-resident');
  if (!sel) return;
  const residents = ResidentStorage.getAll().sort((a, b) => a.name.localeCompare(b.name));
  sel.innerHTML = '<option value="">Select resident…</option>' +
    residents.map(r => `<option value="${escapeHtml(r.name)}" data-room="${escapeHtml(r.roomNumber)}"${r.name === selected ? ' selected' : ''}>${escapeHtml(r.name)} — Room ${escapeHtml(r.roomNumber)}</option>`).join('');
  if (selected) {
    const r = residents.find(r => r.name === selected);
    if (r) { const ri = document.getElementById('maint-room'); if (ri) ri.value = r.roomNumber; }
  }
}

function onResidentChange(e) {
  const opt = e.target.options[e.target.selectedIndex];
  const ri  = document.getElementById('maint-room');
  if (ri) ri.value = opt?.dataset?.room || '';
}

function openAdd() {
  const ov = document.getElementById('maint-modal');
  const form = document.getElementById('maint-form');
  if (!ov || !form) return;
  form.reset();
  document.getElementById('maint-id').value = '';
  document.getElementById('maint-modal-title').textContent = 'New Maintenance Request';
  document.getElementById('btn-save-maint').textContent    = 'Submit request';
  document.getElementById('maint-status-group').style.display = 'none';
  clearFormErrors(form);
  fillResidentSelect();
  openModal(ov);
}

function openEdit(id) {
  const m = MaintenanceStorage.getById(id);
  if (!m) return;
  const ov = document.getElementById('maint-modal');
  if (!ov) return;
  clearFormErrors(document.getElementById('maint-form'));
  document.getElementById('maint-modal-title').textContent = 'Edit Request';
  document.getElementById('btn-save-maint').textContent    = 'Save changes';
  document.getElementById('maint-status-group').style.display = '';
  document.getElementById('maint-id').value          = m.id;
  document.getElementById('maint-room').value        = m.roomNumber;
  document.getElementById('maint-category').value   = m.category;
  document.getElementById('maint-priority').value   = m.priority;
  document.getElementById('maint-description').value= m.description;
  document.getElementById('maint-status').value     = m.status;
  fillResidentSelect(m.residentName);
  openModal(ov);
}

function save() {
  const id   = document.getElementById('maint-id').value;
  const res  = document.getElementById('maint-resident');
  const cat  = document.getElementById('maint-category');
  const pri  = document.getElementById('maint-priority');
  const desc = document.getElementById('maint-description');
  const stat = document.getElementById('maint-status');
  const form = document.getElementById('maint-form');

  clearFormErrors(form);
  let ok = true;
  ok = validateField(res,  'Please select a resident.')  && ok;
  ok = validateField(cat,  'Please select a category.')  && ok;
  ok = validateField(pri,  'Please select a priority.')  && ok;
  ok = validateField(desc, 'Please describe the issue.') && ok;
  if (!ok) return;

  const data = {
    residentName: res.value, roomNumber: document.getElementById('maint-room').value,
    category: cat.value, priority: pri.value, description: desc.value.trim(),
  };

  if (id) {
    data.status = stat.value;
    MaintenanceStorage.update(id, data);
    ActivityStorage.add('maintenance', `Request by <strong>${escapeHtml(data.residentName)}</strong> updated`, 'blue');
    showToast('Request updated.');
  } else {
    MaintenanceStorage.add(data);
    ActivityStorage.add('maintenance', `<strong>${capitalize(data.priority)}</strong> priority request from <strong>${escapeHtml(data.residentName)}</strong> (${escapeHtml(data.category)})`, 'amber');
    showToast('Request submitted.');
  }

  closeModal(document.getElementById('maint-modal'));
  refresh();
}

async function del(id) {
  const m = MaintenanceStorage.getById(id);
  if (!m) return;
  const ok = await showConfirm({
    title: 'Delete Request',
    message: `Delete this ${escapeHtml(m.category)} request from <strong>${escapeHtml(m.residentName)}</strong>?`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;
  MaintenanceStorage.delete(id);
  ActivityStorage.add('maintenance', `Request by <strong>${escapeHtml(m.residentName)}</strong> deleted`, 'red');
  showToast('Request deleted.', 'error');
  refresh();
}
