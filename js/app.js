/* ============================================================
   app.js – Dashboard (Overview page)

   JS Concepts demonstrated:
   ✦ Ch8 Async    — setInterval for real-time clock
   ✦ Ch5 Array    — map, filter, reduce, sort, slice
   ✦ Ch3 Operators — arithmetic for revenue, occupancy %
   ✦ Ch4 Functions — named functions, arrow functions
   ✦ DOM          — getElementById, textContent, innerHTML
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  renderDate();
  startClock();           // Ch8: setInterval — real-time clock
  renderSidebarCounts();
  renderMetrics();
  renderActivity();
  renderRecentMaintenance();
  renderOccupancyPanel();
  renderMaintPreview();
  renderAnnPreview();
  checkNotifDot();
  wireGlobalSearch();     // DOM: keydown + input event listener
  wireKeyboardShortcuts();// DOM: document-level keydown listener
});

// ── Real-time clock (Ch8: setInterval) ───────────────────────

function startClock() {
  // DOM: update textContent every second without page reload
  function tick() {
    const el = document.getElementById('tb-date');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    }) + ' · ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  tick();
  setInterval(tick, 1000);  // Ch8: runs tick() every 1000 ms
}

function renderDate() {
  const sub = document.getElementById('dash-subtitle');
  const now = new Date();
  if (sub) {
    const residents = ResidentStorage.getAll().length;
    const pending   = MaintenanceStorage.getPending().length;
    // Ch3: template literal + ternary operators
    sub.textContent = `${residents} resident${residents !== 1 ? 's' : ''} · ${pending} pending request${pending !== 1 ? 's' : ''}`;
  }
}

// ── Sidebar counts (DOM: getElementById + textContent) ───────

function renderSidebarCounts() {
  const rc = document.getElementById('sb-resident-count');
  const ro = document.getElementById('sb-room-count');
  const mc = document.getElementById('sb-maint-count');
  if (rc) rc.textContent = ResidentStorage.getAll().length;
  if (ro) ro.textContent = RoomStorage.getAll().length;
  if (mc) {
    const p = MaintenanceStorage.getPending().length;
    mc.textContent = p;
    // DOM: dynamically update styles based on data
    mc.style.background = p > 0 ? 'rgba(185,28,28,.25)' : '';
    mc.style.color       = p > 0 ? '#FCA5A5' : '';
  }
}

function checkNotifDot() {
  const dot = document.getElementById('notif-dot');
  // DOM: toggle display based on condition (Ch3: > operator)
  if (dot) dot.style.display = MaintenanceStorage.getPending().length > 0 ? 'block' : 'none';
}

// ── KPI Metric Strip ──────────────────────────────────────────
// Ch5: Array methods + Ch3: arithmetic operators for all metrics

function renderMetrics() {
  const container = document.getElementById('metric-strip');
  if (!container) return;

  const rooms     = RoomStorage.getAll();
  const occupied  = RoomStorage.getOccupied();
  const available = RoomStorage.getAvailable();
  const pending   = MaintenanceStorage.getPending();
  const residents = ResidentStorage.getAll();

  // Ch3: division operator — occupancy percentage
  const pct = rooms.length ? Math.round((occupied.length / rooms.length) * 100) : 0;

  // Ch7: OOP — calling method on class instance
  const monthlyRevenue   = RoomStorage.getTotalRevenue();
  const potentialRevenue = RoomStorage.getPotentialRevenue();

  // Ch5: Array of objects — metric definitions
  const metrics = [
    {
      label: 'Total Residents',
      value: residents.length,
      sub:   `${rooms.length} rooms total`
    },
    {
      label: 'Occupied Rooms',
      value: occupied.length,
      sub:   `${pct}% occupancy rate`
    },
    {
      label: 'Available Rooms',
      value: available.length,
      sub:   'ready to lease'
    },
    {
      label: 'Pending Requests',
      value: pending.length,
      sub:   pending.length > 0
        ? '<span class="down">needs attention</span>'
        : '<span class="up">all clear</span>'
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(monthlyRevenue),
      sub:   `of ${formatCurrency(potentialRevenue)} potential`,
      large: false
    },
  ];

  // Ch5: Array.map() — transform metric objects into HTML strings
  container.innerHTML = metrics.map(m => `
    <div class="metric-item">
      <div class="metric-label">${m.label}</div>
      <div class="metric-value ${m.large === false ? 'metric-value-md' : ''}">${m.value}</div>
      <div class="metric-sub">${m.sub}</div>
    </div>`).join('');
}

// ── Activity Feed ─────────────────────────────────────────────
// DOM: innerHTML to render a dynamic list

function renderActivity() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  const list = ActivityStorage.getAll();

  if (!list.length) {
    feed.innerHTML = `<div class="activity-feed-empty empty"><p>No activity recorded yet.</p></div>`;
    return;
  }

  // Ch5: Array.slice() — only show last 12 entries
  feed.innerHTML = list.slice(0, 12).map(a => `
    <div class="activity-entry">
      <div class="activity-pip ${a.color || 'gray'}"></div>
      <div class="activity-body">
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${timeAgo(a.timestamp)}</div>
      </div>
    </div>`).join('') +
    `<div class="activity-feed-footer">
       <span style="font-size:11px;color:var(--text-3);">Showing last ${Math.min(list.length, 12)} of ${list.length} events</span>
     </div>`;
}

// ── Recent Maintenance Table ───────────────────────────────────
// Ch5: Array.sort() + Array.slice()

function renderRecentMaintenance() {
  const tbody = document.getElementById('recent-maint-tbody');
  if (!tbody) return;

  // Ch5: sort by date (newest first), take top 5
  const all = MaintenanceStorage.getAll()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (!all.length) {
    tbody.innerHTML = `<tr><td colspan="6">${emptyHtml('<path d="M9.5 3.5a3 3 0 0 1-4 4L2 11a2 2 0 1 0 3 3l3.5-3.5a3 3 0 0 1 4-4l-2 2 1.5 1.5 2-2z"/>', 'No requests yet', 'Submit a maintenance request to see it here.')}</td></tr>`;
    return;
  }

  tbody.innerHTML = all.map(m => `
    <tr>
      <td><span style="font-weight:500;">${escapeHtml(m.residentName)}</span></td>
      <td><span class="mono" style="font-size:11px;background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:1px 5px;">${escapeHtml(m.roomNumber)}</span></td>
      <td><span style="font-size:11px;color:var(--text-2);">${escapeHtml(m.category)}</span></td>
      <td>${priorityBadge(m.priority)}</td>
      <td>${maintStatusBadge(m.status)}</td>
      <td style="color:var(--text-3);font-size:11px;">${timeAgo(m.createdAt)}</td>
    </tr>`).join('');
}

// ── Occupancy Panel ───────────────────────────────────────────
// Ch3: division + Ch5: Array.length for percentage calculation

function renderOccupancyPanel() {
  const el = document.getElementById('occupancy-panel');
  if (!el) return;

  const total    = RoomStorage.getAll().length || 1;
  const occupied = RoomStorage.getOccupied().length;
  const avail    = RoomStorage.getAvailable().length;
  const revenue  = RoomStorage.getTotalRevenue();

  // Ch5: Array of objects used as row definitions
  const rows = [
    { label: 'Occupied',  val: occupied, pct: Math.round(occupied / total * 100), color: 'blue'  },
    { label: 'Available', val: avail,    pct: Math.round(avail    / total * 100), color: 'green' },
    { label: 'Total',     val: total,    pct: 100,                                color: ''      },
  ];

  el.innerHTML = rows.map(r => `
    <div class="mini-stat">
      <div class="mini-stat-label">${r.label}</div>
      <div class="mini-stat-bar-wrap">
        <div class="mini-stat-bar ${r.color}" style="width:${r.pct}%"></div>
      </div>
      <div class="mini-stat-val">${r.val}</div>
    </div>`).join('') +
    `<div style="padding:10px var(--s5);border-top:1px solid var(--border);">
       <div style="font-size:11px;color:var(--text-3);">Monthly revenue</div>
       <div style="font-size:14px;font-weight:700;color:var(--text);margin-top:2px;">${formatCurrency(revenue)}</div>
     </div>`;
}

// ── Pending Maintenance Preview ───────────────────────────────

function renderMaintPreview() {
  const el = document.getElementById('maint-preview');
  if (!el) return;

  const pending = MaintenanceStorage.getPending().slice(0, 4);
  if (!pending.length) {
    el.innerHTML = `<div class="empty" style="padding:var(--s5)"><p>No pending requests.</p></div>`;
    return;
  }

  el.innerHTML = pending.map(m => `
    <div class="maint-entry">
      <span class="priority-dot ${m.priority}" style="margin-top:3px;"></span>
      <div class="maint-entry-body">
        <div class="maint-entry-title">${escapeHtml(m.category)} — Room ${escapeHtml(m.roomNumber)}</div>
        <div class="maint-entry-meta">${escapeHtml(m.residentName)} · ${timeAgo(m.createdAt)}</div>
      </div>
    </div>`).join('');
}

// ── Announcements Preview ─────────────────────────────────────

function renderAnnPreview() {
  const el = document.getElementById('ann-preview');
  if (!el) return;

  // Ch5: sort + slice
  const list = AnnouncementStorage.getAll()
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
    .slice(0, 3);

  if (!list.length) {
    el.innerHTML = `<div class="empty" style="padding:var(--s5)"><p>No announcements posted.</p></div>`;
    return;
  }

  el.innerHTML = list.map(a => `
    <div style="padding:10px var(--s5);border-bottom:1px solid var(--border);">
      <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px;">${escapeHtml(a.title)}</div>
      <div style="font-size:11px;color:var(--text-3);">${formatDate(a.date || a.createdAt)}</div>
    </div>`).join('') +
    `<div style="padding:10px var(--s5);">
       <a href="announcements.html" style="font-size:11px;color:var(--blue);font-weight:500;">View all announcements →</a>
     </div>`;
}

// ── Global search shortcut ─────────────────────────────────────
// DOM: addEventListener on document, focus() method

function wireGlobalSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;
  input.addEventListener('input', debounce(e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    // Simple redirect to residents with search pre-filled
    window.location.href = `residents.html?q=${encodeURIComponent(q)}`;
  }, 600));
}

// ── Keyboard shortcuts ─────────────────────────────────────────
// DOM: document.addEventListener('keydown') — global key listener
// Ch6: Switch statement for routing by key

function wireKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Ch3: Logical AND — only trigger if no input is focused
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Ch6: switch — route to page based on key pressed
    switch (e.key) {
      case '1': window.location.href = 'index.html';         break;
      case '2': window.location.href = 'residents.html';     break;
      case '3': window.location.href = 'rooms.html';         break;
      case '4': window.location.href = 'maintenance.html';   break;
      case '5': window.location.href = 'announcements.html'; break;
      case '6': window.location.href = 'analytics.html';     break;
    }
  });
}
