/* ============================================================
   residents.js – Resident management

   JS Concepts demonstrated:
   ✦ Ch8 Async    — async/await, Promise for CSV export
   ✦ Ch5 Array    — filter, sort, map, find
   ✦ Ch4 Functions — named, arrow, higher-order
   ✦ Ch3 Operators — arithmetic for lease days calculation
   ✦ Ch2 Data Types — Number (days), Boolean, String
   ✦ Ch6 Control   — if/else, switch, for...of loop
   ✦ DOM          — createElement, appendChild, dataset, classList
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  init();
  handleUrlSearch();  // Ch8: reads URL params on load
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
  document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);

  // DOM: keyboard shortcut — press Escape to close any open modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal(document.getElementById('resident-modal'));
    }
  });
}

// Ch8: Read query string — pre-fill search from dashboard redirect
function handleUrlSearch() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    const input = document.getElementById('search-residents');
    if (input) { input.value = q; searchQuery = q; }
    renderTable();
  }
}

// ── Filters ───────────────────────────────────────────────────

function buildRoomFilter() {
  const sel = document.getElementById('filter-room');
  if (!sel) return;
  // Ch5: Array.map() to extract room numbers
  const nums = RoomStorage.getAll()
    .map(r => r.roomNumber)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  sel.innerHTML = '<option value="">All Rooms</option>' +
    nums.map(n => `<option value="${escapeHtml(n)}">Room ${escapeHtml(n)}</option>`).join('');
}

function getList() {
  let list = ResidentStorage.getAll();

  // Ch6: if — apply search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    // Ch5: Array.filter() + Ch3: || logical OR across fields
    list = list.filter(r =>
      r.name.toLowerCase().includes(q)       ||
      r.email.toLowerCase().includes(q)      ||
      r.phone.toLowerCase().includes(q)      ||
      r.roomNumber.toLowerCase().includes(q)
    );
  }

  if (filterRoom) list = list.filter(r => r.roomNumber === filterRoom);

  // Ch6: switch — sort strategy
  switch (sortOrder) {
    case 'newest': list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    case 'oldest': list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
    case 'az':     list.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'za':     list.sort((a, b) => b.name.localeCompare(a.name)); break;
  }
  return list;
}

// ── Render ────────────────────────────────────────────────────
// DOM: innerHTML, dynamic table rows, avatarColor, initials

function renderTable() {
  const tbody = document.getElementById('residents-tbody');
  const label = document.getElementById('res-count-label');
  const show  = document.getElementById('res-showing-label');
  if (!tbody) return;

  const list       = getList();
  const total      = ResidentStorage.getAll().length;
  const isFiltered = searchQuery || filterRoom;

  if (label) label.textContent = `${total} resident${total !== 1 ? 's' : ''} total`;
  if (show)  show.textContent  = isFiltered ? `${list.length} of ${total} shown` : '';

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyHtml('<circle cx="6" cy="5" r="3"/><path d="M1 14c0-3 2-5 5-5"/>', 'No residents found', isFiltered ? 'Try adjusting your filters.' : 'Add your first resident to get started.')}</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => {
    const room = RoomStorage.getByNumber(r.roomNumber);

    // Ch3: Arithmetic — lease duration in days
    const leaseDays = ResidentStorage.getLeaseDays(r);
    const leaseLabel = formatLeaseDuration(leaseDays); // Ch4: function call

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
      <td>
        <span class="lease-duration-badge">${leaseLabel}</span>
      </td>
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

// Ch4: Named function — formats days into human-readable lease duration
// Ch2: Input is Number (days), output is String
// Ch6: if/else chain — control flow based on value
function formatLeaseDuration(days) {
  if (days < 0)    return '—';
  if (days < 30)   return `${days}d`;
  if (days < 365)  return `${Math.floor(days / 30)}mo`;
  const years  = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months > 0 ? `${years}y ${months}mo` : `${years}y`;
}

// ── Toolbar ───────────────────────────────────────────────────
// DOM: addEventListener on multiple elements

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

// ── CSV Export (Ch8: async/await + Promise) ───────────────────
// Demonstrates: async function, await, Promise, try/catch
// DOM: createElement('a'), click(), revokeObjectURL()

async function exportCSV() {
  const btn = document.getElementById('btn-export-csv');
  if (btn) { btn.disabled = true; btn.textContent = 'Exporting…'; }

  try {
    // Ch8: await a Promise — simulates async data processing delay
    const residents = await new Promise(resolve => {
      setTimeout(() => resolve(ResidentStorage.getAll()), 400);
    });

    if (!residents.length) {
      showToast('No residents to export.', 'info');
      return;
    }

    // Ch5: Array of column headers
    const headers = ['Name', 'Email', 'Phone', 'Room', 'Move-in Date', 'Lease (days)'];

    // Ch6: for...of loop — build CSV rows
    const rows = [];
    for (const r of residents) {
      const days = ResidentStorage.getLeaseDays(r);
      // Ch2: String.includes() — escape commas for CSV format
      const escape = val => `"${String(val).replace(/"/g, '""')}"`;
      rows.push([
        escape(r.name),
        escape(r.email),
        escape(r.phone),
        escape(r.roomNumber),
        escape(r.moveInDate),
        escape(days)
      ].join(','));
    }

    const csv = [headers.join(','), ...rows].join('\n');

    // DOM: dynamically create an <a> tag and trigger download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');       // DOM: createElement
    a.href     = url;
    a.download = `residents-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);                   // DOM: appendChild
    a.click();                                       // DOM: programmatic click
    document.body.removeChild(a);                   // DOM: removeChild
    URL.revokeObjectURL(url);

    showToast(`Exported ${residents.length} residents.`);
    ActivityStorage.add('resident', `Residents list exported as CSV (${residents.length} records)`, 'blue');

  } catch (err) {
    showToast('Export failed. Please try again.', 'error');
    console.error('CSV export error:', err);
  } finally {
    // Ch8: finally block — always runs regardless of success/failure
    if (btn) { btn.disabled = false; btn.textContent = 'Export CSV'; }
  }
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
    // Ch6: if — skip occupied rooms unless it's the currently selected one
    if (excludeOccupied && r.status === 'occupied' && r.roomNumber !== selected) return;
    const opt = document.createElement('option');   // DOM: createElement
    opt.value       = r.roomNumber;
    opt.textContent = `Room ${r.roomNumber} — ${r.type} · ${formatCurrency(r.monthlyRent)}/mo`;
    if (r.roomNumber === selected) opt.selected = true;
    sel.appendChild(opt);    // DOM: appendChild
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
  document.getElementById('resident-id').value = r.id;
  document.getElementById('res-name').value     = r.name;
  document.getElementById('res-phone').value    = r.phone;
  document.getElementById('res-email').value    = r.email;
  document.getElementById('res-movein').value   = r.moveInDate;
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
  ok = validateField(name,  'Full name is required.')   && ok;
  ok = validateField(phone, 'Phone is required.')        && ok;
  ok = validateEmail(email)                              && ok;
  ok = validateField(room,  'Please select a room.')     && ok;
  ok = validateField(movein,'Move-in date is required.') && ok;
  if (!ok) return;

  const data = {
    name:       name.value.trim(),
    phone:      phone.value.trim(),
    email:      email.value.trim(),
    roomNumber: room.value,
    moveInDate: movein.value,
  };

  if (id) {
    const old = ResidentStorage.getById(id);
    // Ch6: if — only update room status if room changed
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
  // Ch8: async/await with Promise-based confirm dialog
  const ok = await showConfirm({
    title:        'Remove Resident',
    message:      `Remove <strong>${escapeHtml(r.name)}</strong> from Room ${escapeHtml(r.roomNumber)}? This cannot be undone.`,
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
