/* ============================================================
   rooms.js – Room management with split-panel detail view
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  init();
});

let searchQuery  = '';
let filterStatus = '';
let filterType   = '';
let filterFloor  = '';
let selectedRoomId = null;

function init() {
  buildFloorFilter();
  renderTable();
  wireToolbar();
  wireModal();
  document.getElementById('btn-add-room')?.addEventListener('click', openAdd);
  document.getElementById('btn-save-room')?.addEventListener('click', save);
  updateSubtitle();
}

// ── Subtitle ──────────────────────────────────────────────────

function updateSubtitle() {
  const el = document.getElementById('room-count-label');
  if (!el) return;
  const total    = RoomStorage.getAll().length;
  const occupied = RoomStorage.getOccupied().length;
  el.textContent = `${total} rooms · ${occupied} occupied`;
}

// ── Floor filter ──────────────────────────────────────────────

function buildFloorFilter() {
  const sel = document.getElementById('filter-floor');
  if (!sel) return;
  const floors = [...new Set(RoomStorage.getAll().map(r => r.floor))].sort((a, b) => +a - +b);
  sel.innerHTML = '<option value="">All floors</option>' +
    floors.map(f => `<option value="${f}">Floor ${f}</option>`).join('');
}

// ── Filtered list ─────────────────────────────────────────────

function getList() {
  let list = RoomStorage.getAll();
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(r =>
      r.roomNumber.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      String(r.floor).includes(q)
    );
  }
  if (filterStatus) list = list.filter(r => r.status  === filterStatus);
  if (filterType)   list = list.filter(r => r.type    === filterType);
  if (filterFloor)  list = list.filter(r => r.floor   === filterFloor);
  list.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  return list;
}

// ── Render table ──────────────────────────────────────────────

function renderTable() {
  const tbody = document.getElementById('rooms-tbody');
  const show  = document.getElementById('room-showing-label');
  if (!tbody) return;

  const list  = getList();
  const total = RoomStorage.getAll().length;
  const isF   = searchQuery || filterStatus || filterType || filterFloor;
  if (show) show.textContent = isF ? `${list.length} of ${total} shown` : '';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6">${emptyHtml('<path d="M2 14V6l6-4 6 4v8"/><path d="M6 14v-4h4v4"/>', 'No rooms found', isF ? 'Try adjusting your filters.' : 'Add your first room to get started.')}</td></tr>`;
    // Clear detail panel if the selected room is no longer visible
    if (selectedRoomId) { selectedRoomId = null; renderDetailPanel(null); }
    return;
  }

  tbody.innerHTML = list.map(room => {
    const tenant = ResidentStorage.getAll().find(r => r.roomNumber === room.roomNumber);
    const isSel  = room.id === selectedRoomId;
    return `<tr class="room-row${isSel ? ' selected' : ''}" onclick="selectRoom('${room.id}')" data-id="${room.id}">
      <td>
        <span style="font-weight:700;font-size:13px;letter-spacing:-.01em;">${escapeHtml(room.roomNumber)}</span>
      </td>
      <td style="color:var(--text-2);">Floor ${escapeHtml(String(room.floor))}</td>
      <td style="color:var(--text-2);">${escapeHtml(room.type)}</td>
      <td style="font-weight:600;font-size:12px;">${formatCurrency(room.monthlyRent)}</td>
      <td>
        ${tenant
          ? `<div style="display:flex;align-items:center;gap:7px;">
               <div class="avatar avatar-sm" style="background:${avatarColor(tenant.name)};width:22px;height:22px;font-size:9px;">${initials(tenant.name)}</div>
               <span style="font-size:12px;">${escapeHtml(tenant.name)}</span>
             </div>`
          : '<span style="color:var(--text-3);font-size:12px;">—</span>'
        }
      </td>
      <td>${roomStatusBadge(room.status)}</td>
    </tr>`;
  }).join('');

  // Re-render detail if selected room still exists
  if (selectedRoomId) {
    const still = list.find(r => r.id === selectedRoomId);
    if (still) renderDetailPanel(still);
    else { selectedRoomId = null; renderDetailPanel(null); }
  }

  updateSubtitle();
}

// ── Room detail panel ─────────────────────────────────────────

function selectRoom(id) {
  selectedRoomId = (selectedRoomId === id) ? null : id;
  // Update row highlight
  document.querySelectorAll('.room-row').forEach(row => {
    row.classList.toggle('selected', row.dataset.id === selectedRoomId);
  });
  const room = selectedRoomId ? RoomStorage.getById(selectedRoomId) : null;
  renderDetailPanel(room);
}

function renderDetailPanel(room) {
  const panel = document.getElementById('room-detail-panel');
  if (!panel) return;

  if (!room) {
    panel.innerHTML = `
      <div class="room-detail-empty">
        <div class="icon">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 14V6l6-4 6 4v8"/><path d="M6 14v-4h4v4"/></svg>
        </div>
        <p>Select a room to view details.</p>
      </div>`;
    return;
  }

  const tenant = ResidentStorage.getAll().find(r => r.roomNumber === room.roomNumber);
  const maint  = MaintenanceStorage.getAll()
    .filter(m => m.roomNumber === room.roomNumber)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  panel.innerHTML = `
    <div class="room-detail-header">
      <div>
        <div class="room-detail-num">Room ${escapeHtml(room.roomNumber)}</div>
        <div class="room-detail-type">${escapeHtml(room.type)} · Floor ${escapeHtml(String(room.floor))}</div>
      </div>
      ${roomStatusBadge(room.status)}
    </div>

    <div class="room-detail-body">

      <div class="room-detail-section">
        <div class="room-detail-section-title">Room Details</div>
        <div class="detail-row"><span class="detail-label">Rent</span><span class="detail-value">${formatCurrency(room.monthlyRent)}/mo</span></div>
        <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${escapeHtml(room.type)}</span></div>
        <div class="detail-row"><span class="detail-label">Floor</span><span class="detail-value">${escapeHtml(String(room.floor))}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${capitalize(room.status)}</span></div>
      </div>

      <div class="room-detail-section">
        <div class="room-detail-section-title">Current Tenant</div>
        ${tenant ? `
          <div class="room-tenant-card">
            <div class="avatar avatar-sm" style="background:${avatarColor(tenant.name)};">${initials(tenant.name)}</div>
            <div>
              <div class="room-tenant-name">${escapeHtml(tenant.name)}</div>
              <div class="room-tenant-meta">${escapeHtml(tenant.email)}</div>
              <div class="room-tenant-meta">Since ${formatDate(tenant.moveInDate)}</div>
            </div>
          </div>` :
          `<div style="font-size:12px;color:var(--text-3);padding:var(--s2) 0;">No tenant assigned.</div>`
        }
      </div>

      ${maint.length ? `
      <div class="room-detail-section">
        <div class="room-detail-section-title">Recent Maintenance (${maint.length})</div>
        ${maint.map(m => `
          <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">
            <span class="priority-dot ${m.priority}"></span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(m.category)}</div>
              <div style="font-size:11px;color:var(--text-3);">${timeAgo(m.createdAt)}</div>
            </div>
            ${maintStatusBadge(m.status)}
          </div>`).join('')}
      </div>` : ''}

    </div>

    <div class="room-detail-actions">
      <button class="btn btn-secondary btn-sm" onclick="openEdit('${room.id}')">Edit room</button>
      <button class="btn btn-danger btn-sm" onclick="del('${room.id}')">Delete</button>
    </div>`;
}

// ── Toolbar ───────────────────────────────────────────────────

function wireToolbar() {
  document.getElementById('search-rooms')?.addEventListener('input', debounce(e => {
    searchQuery = e.target.value.trim(); renderTable();
  }));
  document.getElementById('filter-status')?.addEventListener('change', e => { filterStatus = e.target.value; renderTable(); });
  document.getElementById('filter-type')?.addEventListener('change',   e => { filterType   = e.target.value; renderTable(); });
  document.getElementById('filter-floor')?.addEventListener('change',  e => { filterFloor  = e.target.value; renderTable(); });
}

// ── Modal ─────────────────────────────────────────────────────

function wireModal() {
  const ov = document.getElementById('room-modal');
  if (ov) wireModalClose(ov);
}

function openAdd() {
  const ov = document.getElementById('room-modal');
  const form = document.getElementById('room-form');
  if (!ov || !form) return;
  form.reset();
  document.getElementById('room-id').value = '';
  document.getElementById('room-modal-title').textContent = 'Add Room';
  clearFormErrors(form);
  openModal(ov);
}

function openEdit(id) {
  const room = RoomStorage.getById(id);
  if (!room) return;
  const ov = document.getElementById('room-modal');
  if (!ov) return;
  clearFormErrors(document.getElementById('room-form'));
  document.getElementById('room-modal-title').textContent = 'Edit Room';
  document.getElementById('room-id').value     = room.id;
  document.getElementById('room-number').value = room.roomNumber;
  document.getElementById('room-floor').value  = room.floor;
  document.getElementById('room-type').value   = room.type;
  document.getElementById('room-rent').value   = room.monthlyRent;
  document.getElementById('room-status').value = room.status;
  openModal(ov);
}

function save() {
  const id     = document.getElementById('room-id').value;
  const number = document.getElementById('room-number');
  const floor  = document.getElementById('room-floor');
  const type   = document.getElementById('room-type');
  const rent   = document.getElementById('room-rent');
  const status = document.getElementById('room-status');
  const form   = document.getElementById('room-form');

  clearFormErrors(form);
  let ok = true;
  ok = validateField(number, 'Room number is required.') && ok;
  ok = validateField(floor,  'Floor is required.')       && ok;
  ok = validateField(type,   'Room type is required.')   && ok;
  ok = validateField(rent,   'Monthly rent is required.')&& ok;
  if (!ok) return;

  const data = {
    roomNumber: number.value.trim(), floor: floor.value.trim(),
    type: type.value, monthlyRent: parseFloat(rent.value), status: status.value,
  };

  if (id) {
    const existing = RoomStorage.getByNumber(data.roomNumber);
    if (existing && existing.id !== id) {
      setFieldError(number, 'A room with this number already exists.'); return;
    }
    RoomStorage.update(id, data);
    ActivityStorage.add('room', `Room <strong>${escapeHtml(data.roomNumber)}</strong> updated`, 'blue');
    showToast('Room updated.');
    if (selectedRoomId === id) renderDetailPanel(RoomStorage.getById(id));
  } else {
    if (RoomStorage.getByNumber(data.roomNumber)) {
      setFieldError(number, 'A room with this number already exists.'); return;
    }
    RoomStorage.add(data);
    ActivityStorage.add('room', `Room <strong>${escapeHtml(data.roomNumber)}</strong> added`, 'green');
    showToast('Room added.');
  }

  closeModal(document.getElementById('room-modal'));
  buildFloorFilter();
  renderTable();
}

async function del(id) {
  const room = RoomStorage.getById(id);
  if (!room) return;
  const tenant = ResidentStorage.getAll().find(r => r.roomNumber === room.roomNumber);
  const msg = tenant
    ? `Room ${escapeHtml(room.roomNumber)} is occupied by <strong>${escapeHtml(tenant.name)}</strong>. Deleting the room will not remove the resident record. Continue?`
    : `Delete Room <strong>${escapeHtml(room.roomNumber)}</strong>? This cannot be undone.`;
  const ok = await showConfirm({ title: 'Delete Room', message: msg, confirmLabel: 'Delete' });
  if (!ok) return;
  RoomStorage.delete(id);
  if (selectedRoomId === id) { selectedRoomId = null; renderDetailPanel(null); }
  ActivityStorage.add('room', `Room <strong>${escapeHtml(room.roomNumber)}</strong> deleted`, 'red');
  showToast('Room deleted.', 'error');
  buildFloorFilter();
  renderTable();
}
