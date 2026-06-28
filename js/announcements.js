/* ============================================================
   announcements.js – Announcements feed
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  init();
});

let searchQuery = '';
let sortOrder   = 'newest';

function init() {
  renderFeed();
  wireToolbar();
  wireModal();
  document.getElementById('btn-add-ann')?.addEventListener('click', openAdd);
  document.getElementById('btn-save-ann')?.addEventListener('click', save);
}

// ── List ──────────────────────────────────────────────────────

function getList() {
  let list = AnnouncementStorage.getAll();
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }
  switch (sortOrder) {
    case 'newest': list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)); break;
    case 'oldest': list.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt)); break;
    case 'az':     list.sort((a, b) => a.title.localeCompare(b.title)); break;
  }
  return list;
}

// ── Render ────────────────────────────────────────────────────

function renderFeed() {
  const feed  = document.getElementById('ann-feed');
  const label = document.getElementById('ann-count-label');
  if (!feed) return;

  const list  = getList();
  const total = AnnouncementStorage.getAll().length;
  if (label) label.textContent = `${total} announcement${total !== 1 ? 's' : ''}`;

  if (!list.length) {
    feed.innerHTML = emptyHtml(
      '<path d="M14 9H2a2 2 0 0 1 2-2V5a4 4 0 0 1 8 0v2a2 2 0 0 1 2 2z"/><path d="M6.5 12.5a1.5 1.5 0 0 0 3 0"/>',
      'No announcements yet',
      searchQuery ? 'Try a different search term.' : 'Post an announcement to inform all residents.'
    );
    return;
  }

  feed.innerHTML = list.map(a => {
    const d = new Date(a.date || a.createdAt);
    const day   = isNaN(d) ? '—' : d.toLocaleDateString('en-US', { day: 'numeric' });
    const month = isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

    return `
      <div class="ann-entry">
        <div class="ann-date-col">
          <div class="ann-date-day">${day}</div>
          <div class="ann-date-month">${month}</div>
        </div>
        <div class="ann-divider"></div>
        <div class="ann-body">
          <div class="ann-title">${escapeHtml(a.title)}</div>
          <div class="ann-desc">${escapeHtml(a.description)}</div>
          <div class="ann-entry-foot">
            <span class="ann-ts">Posted ${timeAgo(a.createdAt)}</span>
            <div class="ann-actions">
              <button class="btn btn-ghost btn-sm" onclick="openEdit('${a.id}')">Edit</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="del('${a.id}')">Delete</button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Toolbar ───────────────────────────────────────────────────

function wireToolbar() {
  document.getElementById('search-ann')?.addEventListener('input', debounce(e => {
    searchQuery = e.target.value.trim(); renderFeed();
  }));
  document.getElementById('sort-ann')?.addEventListener('change', e => {
    sortOrder = e.target.value; renderFeed();
  });
}

// ── Modal ─────────────────────────────────────────────────────

function wireModal() {
  const ov = document.getElementById('ann-modal');
  if (ov) wireModalClose(ov);
}

function openAdd() {
  const ov = document.getElementById('ann-modal');
  const form = document.getElementById('ann-form');
  if (!ov || !form) return;
  form.reset();
  document.getElementById('ann-id').value = '';
  document.getElementById('ann-modal-title').textContent = 'New Announcement';
  document.getElementById('btn-save-ann').textContent    = 'Post announcement';
  document.getElementById('ann-date').value = new Date().toISOString().split('T')[0];
  clearFormErrors(form);
  openModal(ov);
}

function openEdit(id) {
  const a = AnnouncementStorage.getById(id);
  if (!a) return;
  const ov = document.getElementById('ann-modal');
  if (!ov) return;
  clearFormErrors(document.getElementById('ann-form'));
  document.getElementById('ann-modal-title').textContent = 'Edit Announcement';
  document.getElementById('btn-save-ann').textContent    = 'Save changes';
  document.getElementById('ann-id').value         = a.id;
  document.getElementById('ann-title').value      = a.title;
  document.getElementById('ann-date').value       = a.date || a.createdAt?.split('T')[0] || '';
  document.getElementById('ann-description').value= a.description;
  openModal(ov);
}

function save() {
  const id    = document.getElementById('ann-id').value;
  const title = document.getElementById('ann-title');
  const date  = document.getElementById('ann-date');
  const desc  = document.getElementById('ann-description');
  const form  = document.getElementById('ann-form');

  clearFormErrors(form);
  let ok = true;
  ok = validateField(title, 'Title is required.')       && ok;
  ok = validateField(date,  'Date is required.')         && ok;
  ok = validateField(desc,  'Body text is required.')    && ok;
  if (!ok) return;

  const data = { title: title.value.trim(), date: date.value, description: desc.value.trim() };

  if (id) {
    AnnouncementStorage.update(id, data);
    ActivityStorage.add('announcement', `Announcement updated: <strong>${escapeHtml(data.title)}</strong>`, 'blue');
    showToast('Announcement updated.');
  } else {
    AnnouncementStorage.add(data);
    ActivityStorage.add('announcement', `Announcement posted: <strong>${escapeHtml(data.title)}</strong>`, 'amber');
    showToast('Announcement posted.');
  }

  closeModal(document.getElementById('ann-modal'));
  renderFeed();
}

async function del(id) {
  const a = AnnouncementStorage.getById(id);
  if (!a) return;
  const ok = await showConfirm({
    title: 'Delete Announcement',
    message: `Delete "<strong>${escapeHtml(a.title)}</strong>"? This cannot be undone.`,
    confirmLabel: 'Delete',
  });
  if (!ok) return;
  AnnouncementStorage.delete(id);
  ActivityStorage.add('announcement', `Announcement deleted: <strong>${escapeHtml(a.title)}</strong>`, 'red');
  showToast('Announcement deleted.', 'error');
  renderFeed();
}
