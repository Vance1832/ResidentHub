/* ============================================================
   residents.js – Resident management
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  init();
});

let searchQuery = '';
let filterRoom  = '';
let sortOrder   = 'newest';

function init() {
  buildRoomFilter();
  renderTable();
  wireToolbar();
  wireModal();
  document.getElementById('btn-add-resident')?.addEventListener('click', openAdd);
  document.getElementById('btn-save-resident')?.addEventListener('click', save);
}

// ── Filters ───────────────────────────────────────────────────

function buildRoomFilter() {
  const sel = document.getElementById('filter-room');
  if (!sel) return;
  const nums = RoomStorage.getAll().map(r => r.roomNumber).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  sel.innerHTML = '<option value="">All Rooms</option>' +
    nums.map(n => `<option value="${escapeHtml(n)}">Room ${escapeHtml(n)}</option>`).join('');
}

function getList() {
  let list = ResidentStorage.getAll();
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.roomNumber.toLowerCase().includes(q)
    );
  }
  if (filterRoom) list = list.filter(r => r.roomNumber === filterRoom);
  switch (sortOrder) {
    case 'newest': list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'oldest': list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'az':     list.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'za':     list.sort((a, b) => b.name.localeCompare(a.name)); break;
  }
  return list;
}

// ── Render ────────────────────────────────────────────────────

function renderTable() {
  const tbody = document.getElementById('residents-tbody');
  const label = document.getElementById('res-count-label');
  const show  = document.getElementById('res-showing-label');
  if (!tbody) return;

  const list  = getList();
  const total = ResidentStorage.getAll().length;
  const isFiltered = searchQuery || filterRoom;

  if (label) label.textContent = `${total} resident${total !== 1 ? 's' : ''} total`;
  if (show)  show.textContent  = isFiltered ? `${list.length} of ${total} shown` : '';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6">${emptyHtml('<circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2-5 5-5"/>', 'No residents found', isFiltered ? 'Try adjusting your filters.' : 'Add your first resident to get started.')}</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => {
    const room = RoomStorage.getByNumber(r.roomNumber);
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="avatar avatar-sm" style="background:${avatarColor(r.name)};">${initials(r.name)}</div>
          <div>
            <div style="font-weight:600;font-size:12px;">${escapeHtml(r.name)}</div>
            <div class="td-meta">Since ${formatDate(r.moveInDate)}</div>
          </div>
        </div>
      </td>
      <td>
        <div style="font-size:12px;">${escapeHtml(r.email)}</div>
        <div class="td-meta">${escapeHtml(r.phone)}</div>
      </td>
      <td>
        <span class="mono" style="font-size:12px;background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:2px 6px;font-weight:600;">${escapeHtml(r.roomNumber)}</span>
      </td>
      <td style="font-size:12px;color:var(--text-2);">${formatDate(r.moveInDate)}</td>
      <td>${room ? roomStatusBadge(room.status) : '<span class="badge badge-gray">—</span>'}</td>
      <td>
        <div class="td-actions-right">
          <button class="btn btn-ghost btn-sm" onclick="openEdit('${r.id}')">Edit</button>
          <button class="icon-btn" onclick="del('${r.id}')" title="Delete">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l1 9.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5L13 4"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Toolbar ───────────────────────────────────────────────────

function wireToolbar() {
  document.getElementById('search-residents')?.addEventListener('input', debounce(e => {
    searchQuery = e.target.value.trim(); renderTable();
  }));
  document.getElementById('filter-room')?.addEventListener('change', e => {
    filterRoom = e.target.value; renderTable();
  });
  document.getElementById('sort-residents')?.addEventListener('change', e => {
    sortOrder = e.target.value; renderTable();
  });
}

// ── Modal ─────────────────────────────────────────────────────

function wireModal() {
  const ov = document.getElementById('resident-modal');
  if (ov) wireModalClose(ov);
}

function fillRoomSelect(selected = '', excludeOccupied = true) {
  const sel = document.getElementById('res-room');
  if (!sel) return;
  const rooms = RoomStorage.getAll();
  sel.innerHTML = '<option value="">Select a room…</option>';
  rooms.forEach(r => {
    if (excludeOccupied && r.status === 'occupied' && r.roomNumber !== selected) return;
    const opt = document.createElement('option');
    opt.value = r.roomNumber;
    opt.textContent = `Room ${r.roomNumber} — ${r.type} · ${formatCurrency(r.monthlyRent)}/mo`;
    if (r.roomNumber === selected) opt.selected = true;
    sel.appendChild(opt);
  });
}

function openAdd() {
  const ov   = document.getElementById('resident-modal');
  const form = document.getElementById('resident-form');
  if (!ov || !form) return;
  form.reset();
  document.getElementById('resident-id').value = '';
  document.getElementById('res-modal-title').textContent = 'Add Resident';
  clearFormErrors(form);
  fillRoomSelect();
  openModal(ov);
}

function openEdit(id) {
  const r  = ResidentStorage.getById(id);
  if (!r) return;
  const ov = document.getElementById('resident-modal');
  if (!ov) return;
  clearFormErrors(document.getElementById('resident-form'));
  document.getElementById('res-modal-title').textContent = 'Edit Resident';
  document.getElementById('resident-id').value  = r.id;
  document.getElementById('res-name').value      = r.name;
  document.getElementById('res-phone').value     = r.phone;
  document.getElementById('res-email').value     = r.email;
  document.getElementById('res-movein').value    = r.moveInDate;
  fillRoomSelect(r.roomNumber, true);
  openModal(ov);
}

function save() {
  const id     = document.getElementById('resident-id').value;
  const name   = document.getElementById('res-name');
  const phone  = document.getElementById('res-phone');
  const email  = document.getElementById('res-email');
  const room   = document.getElementById('res-room');
  const movein = document.getElementById('res-movein');
  const form   = document.getElementById('resident-form');

  clearFormErrors(form);
  let ok = true;
  ok = validateField(name,  'Full name is required.')     && ok;
  ok = validateField(phone, 'Phone is required.')          && ok;
  ok = validateEmail(email)                                && ok;
  ok = validateField(room,  'Please select a room.')       && ok;
  ok = validateField(movein,'Move-in date is required.')   && ok;
  if (!ok) return;

  const data = {
    name: name.value.trim(), phone: phone.value.trim(),
    email: email.value.trim(), roomNumber: room.value, moveInDate: movein.value,
  };

  if (id) {
    const old = ResidentStorage.getById(id);
    if (old && old.roomNumber !== data.roomNumber) {
      const oldR = RoomStorage.getByNumber(old.roomNumber);
      if (oldR) RoomStorage.update(oldR.id, { status: 'available' });
      const newR = RoomStorage.getByNumber(data.roomNumber);
      if (newR) RoomStorage.update(newR.id, { status: 'occupied' });
    }
    ResidentStorage.update(id, data);
    ActivityStorage.add('resident', `<strong>${escapeHtml(data.name)}</strong> record updated`, 'blue');
    showToast('Resident updated.');
  } else {
    ResidentStorage.add(data);
    const newR = RoomStorage.getByNumber(data.roomNumber);
    if (newR) RoomStorage.update(newR.id, { status: 'occupied' });
    ActivityStorage.add('resident', `<strong>${escapeHtml(data.name)}</strong> added to Room ${escapeHtml(data.roomNumber)}`, 'blue');
    showToast('Resident added.');
  }

  closeModal(document.getElementById('resident-modal'));
  buildRoomFilter();
  renderTable();
}

async function del(id) {
  const r = ResidentStorage.getById(id);
  if (!r) return;
  const ok = await showConfirm({
    title: 'Remove Resident',
    message: `Remove <strong>${escapeHtml(r.name)}</strong> from Room ${escapeHtml(r.roomNumber)}? This cannot be undone.`,
    confirmLabel: 'Remove',
  });
  if (!ok) return;
  const room = RoomStorage.getByNumber(r.roomNumber);
  if (room) RoomStorage.update(room.id, { status: 'available' });
  ResidentStorage.delete(id);
  ActivityStorage.add('resident', `<strong>${escapeHtml(r.name)}</strong> removed`, 'red');
  showToast('Resident removed.', 'error');
  buildRoomFilter();
  renderTable();
}
