/* ============================================================
   analytics.js – Property Analytics page

   JS Concepts demonstrated:
   ✦ Ch5 Array    — reduce, map, filter, sort, find, forEach
   ✦ Ch5 Object   — Object.entries(), Object.keys(), destructuring
   ✦ Ch7 OOP      — calling methods on storage class instances
   ✦ Ch4 Functions — named functions, arrow functions, closures
   ✦ Ch3 Operators — %, /, *, Math.round for percentages
   ✦ Ch2 Data Types — Number, String, Boolean in calculations
   ✦ Ch6 Control   — for...of, if/else, ternary
   ✦ DOM          — createElement, appendChild, style, classList
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  renderSummaryCards();
  renderRevenueByType();
  renderMaintenanceBreakdown();
  renderResidentStats();
  renderRoomRentTable();
});

// ── Summary Cards ─────────────────────────────────────────────
// Ch5: Array.reduce() for all aggregate calculations
// Ch3: Arithmetic operators — %, /

function renderSummaryCards() {
  const container = document.getElementById('analytics-summary');
  if (!container) return;

  const rooms     = RoomStorage.getAll();
  const occupied  = RoomStorage.getOccupied();
  const residents = ResidentStorage.getAll();
  const maint     = MaintenanceStorage.getAll();

  // Ch3: division + multiplication — occupancy rate
  const occupancyPct  = rooms.length ? Math.round((occupied.length / rooms.length) * 100) : 0;

  // Ch7: OOP method calls
  const monthlyRev  = RoomStorage.getTotalRevenue();
  const potentialRev = RoomStorage.getPotentialRevenue();
  const avgRent     = RoomStorage.getAverageRent();
  const avgLease    = ResidentStorage.getAverageLeaseDays();

  // Ch3: Math.round — annual projection
  const annualRev   = monthlyRev * 12;

  // Ch5: Array.filter() + .length — count completed maintenance
  const resolvedPct = maint.length
    ? Math.round((maint.filter(m => m.status === 'completed').length / maint.length) * 100)
    : 0;

  // Ch5: Array of objects — card definitions
  const cards = [
    { label: 'Occupancy Rate',      value: `${occupancyPct}%`,           sub: `${occupied.length} of ${rooms.length} rooms occupied`,  accent: occupancyPct >= 75 ? 'green' : 'amber' },
    { label: 'Monthly Revenue',     value: formatCurrency(monthlyRev),   sub: `${formatCurrency(potentialRev)} potential`,             accent: 'blue'  },
    { label: 'Annual Projection',   value: formatCurrency(annualRev),    sub: 'based on current occupancy',                           accent: 'blue'  },
    { label: 'Average Rent',        value: formatCurrency(avgRent),      sub: 'across all rooms',                                     accent: ''      },
    { label: 'Avg Lease Duration',  value: `${Math.floor(avgLease / 30)}mo`, sub: `${avgLease} days average stay`,                   accent: ''      },
    { label: 'Maintenance Resolved',value: `${resolvedPct}%`,            sub: `${maint.filter(m => m.status === 'completed').length} of ${maint.length} requests`, accent: resolvedPct >= 50 ? 'green' : 'amber' },
  ];

  // DOM: innerHTML + Ch5: Array.map()
  container.innerHTML = cards.map(c => `
    <div class="analytics-card">
      <div class="analytics-card-label">${c.label}</div>
      <div class="analytics-card-value ${c.accent ? 'accent-' + c.accent : ''}">${c.value}</div>
      <div class="analytics-card-sub">${c.sub}</div>
    </div>`).join('');
}

// ── Revenue by Room Type ──────────────────────────────────────
// Ch5: Object.entries() to iterate grouped data
// Ch7: getRevenueByType() — method on RoomStorageClass
// DOM: document.createElement(), appendChild(), style.width

function renderRevenueByType() {
  const container = document.getElementById('chart-revenue-type');
  if (!container) return;

  // Ch7: OOP method — returns { 'Studio': { count, occupied, revenue, potential }, ... }
  const byType = RoomStorage.getRevenueByType();

  // Ch5: Object.entries() — converts object to array of [key, value] pairs
  // Ch5: Array.sort() — sort by revenue descending
  const sorted = Object.entries(byType)
    .sort(([, a], [, b]) => b.revenue - a.revenue);

  if (!sorted.length) {
    container.innerHTML = `<p style="color:var(--text-3);font-size:12px;">No room data.</p>`;
    return;
  }

  // Ch5: Array.reduce() — find max revenue for scale reference
  const maxRevenue = sorted.reduce((max, [, d]) => Math.max(max, d.potential), 0);

  // DOM: clear and rebuild using createElement
  container.innerHTML = '';

  // Ch6: for...of — iterate each room type entry
  for (const [type, data] of sorted) {
    // Ch3: division + multiplication — bar width as percentage
    const revPct  = maxRevenue > 0 ? (data.revenue  / maxRevenue * 100) : 0;
    const potPct  = maxRevenue > 0 ? (data.potential / maxRevenue * 100) : 0;

    // DOM: createElement for each chart row
    const row = document.createElement('div');
    row.className = 'chart-row';

    // Ch2: String template with Number formatting
    row.innerHTML = `
      <div class="chart-label">
        <span class="chart-label-text">${escapeHtml(type)}</span>
        <span class="chart-label-sub">${data.occupied}/${data.count} occupied</span>
      </div>
      <div class="chart-bars">
        <div class="chart-bar-wrap" title="Actual revenue: ${formatCurrency(data.revenue)}">
          <div class="chart-bar chart-bar-solid" style="width:${revPct.toFixed(1)}%"></div>
        </div>
        <div class="chart-bar-wrap chart-bar-wrap-bg" title="Potential: ${formatCurrency(data.potential)}">
          <div class="chart-bar chart-bar-ghost" style="width:${potPct.toFixed(1)}%"></div>
        </div>
      </div>
      <div class="chart-values">
        <span class="chart-val-main">${formatCurrency(data.revenue)}</span>
        <span class="chart-val-sub">/ ${formatCurrency(data.potential)}</span>
      </div>`;

    container.appendChild(row);   // DOM: appendChild
  }

  // Legend
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  legend.innerHTML = `
    <span class="legend-item"><span class="legend-dot legend-dot-solid"></span>Actual revenue</span>
    <span class="legend-item"><span class="legend-dot legend-dot-ghost"></span>Potential (all occupied)</span>`;
  container.appendChild(legend);
}

// ── Maintenance Breakdown ─────────────────────────────────────
// Ch5: Object.entries(), Array.sort()
// Ch3: % modulo not needed here — but division for percentages
// DOM: createElement, style, appendChild

function renderMaintenanceBreakdown() {
  const catContainer  = document.getElementById('chart-maint-category');
  const priContainer  = document.getElementById('chart-maint-priority');
  if (!catContainer || !priContainer) return;

  // Ch7: OOP — grouped data from class methods
  const byCategory = MaintenanceStorage.getByCategory();
  const byPriority = MaintenanceStorage.getByPriority();
  const total      = MaintenanceStorage.getAll().length;

  // Ch4: Reusable function — builds a bar chart into a container
  // Demonstrates: function as a unit of reusability (Ch4)
  function buildBarChart(container, data, colorMap) {
    container.innerHTML = '';

    if (!Object.keys(data).length) {
      container.innerHTML = `<p style="color:var(--text-3);font-size:12px;">No data.</p>`;
      return;
    }

    // Ch5: Object.entries() + Array.sort() — sort by count
    const sorted = Object.entries(data)
      .sort(([, a], [, b]) => b - a);

    // Ch5: Array.reduce() — find max for scaling
    const max = sorted.reduce((m, [, v]) => Math.max(m, v), 0);

    for (const [label, count] of sorted) {
      // Ch3: division * 100 — percentage width
      const pct = max > 0 ? (count / max * 100) : 0;
      // Ch3: division for share % of total
      const share = total > 0 ? Math.round(count / total * 100) : 0;
      const color = colorMap[label.toLowerCase()] || 'var(--blue)';

      const row = document.createElement('div');
      row.className = 'chart-row chart-row-sm';
      row.innerHTML = `
        <div class="chart-label">
          <span class="chart-label-text">${escapeHtml(label)}</span>
        </div>
        <div class="chart-bars">
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="width:${pct.toFixed(1)}%;background:${color};"></div>
          </div>
        </div>
        <div class="chart-values">
          <span class="chart-val-main">${count}</span>
          <span class="chart-val-sub">${share}%</span>
        </div>`;
      container.appendChild(row);
    }
  }

  // Ch5: Object — color mapping for category and priority
  const categoryColors = {
    plumbing:   'var(--blue)',
    electrical: 'var(--amber)',
    hvac:       'var(--purple)',
    appliance:  'var(--green)',
  };

  const priorityColors = {
    high:   'var(--red)',
    medium: 'var(--amber)',
    low:    'var(--text-3)',
  };

  buildBarChart(catContainer, byCategory, categoryColors);
  buildBarChart(priContainer, byPriority, priorityColors);
}

// ── Resident Stats ────────────────────────────────────────────
// Ch5: Array.map() to transform, Array.sort() to rank

function renderResidentStats() {
  const container = document.getElementById('analytics-residents');
  if (!container) return;

  const residents = ResidentStorage.getAll();
  if (!residents.length) {
    container.innerHTML = `<p style="color:var(--text-3);font-size:12px;">No residents.</p>`;
    return;
  }

  // Ch5: Array.map() — add computed leaseDays to each resident object
  const withDays = residents.map(r => ({
    ...r,           // Ch5: Object spread — copy all properties
    leaseDays: ResidentStorage.getLeaseDays(r)
  }));

  // Ch5: Array.sort() — longest tenants first
  const sorted = withDays.sort((a, b) => b.leaseDays - a.leaseDays);

  // Ch5: Array.find() — longest and shortest tenure
  const longest  = sorted[0];
  const shortest = sorted[sorted.length - 1];

  // Ch5: Array.reduce() for average
  const avgDays = Math.round(
    withDays.reduce((sum, r) => sum + r.leaseDays, 0) / withDays.length
  );

  container.innerHTML = `
    <div class="stat-trio">
      <div class="stat-trio-item">
        <div class="stat-trio-val">${Math.floor(avgDays / 30)}<span style="font-size:14px;font-weight:500;">mo</span></div>
        <div class="stat-trio-label">Avg stay</div>
      </div>
      <div class="stat-trio-item">
        <div class="stat-trio-val">${Math.floor(longest.leaseDays / 30)}<span style="font-size:14px;font-weight:500;">mo</span></div>
        <div class="stat-trio-label">Longest — ${escapeHtml(longest.name.split(' ')[0])}</div>
      </div>
      <div class="stat-trio-item">
        <div class="stat-trio-val">${Math.floor(shortest.leaseDays / 30)}<span style="font-size:14px;font-weight:500;">mo</span></div>
        <div class="stat-trio-label">Shortest — ${escapeHtml(shortest.name.split(' ')[0])}</div>
      </div>
    </div>
    <div style="margin-top:var(--s4);">
      ${sorted.map(r => `
        <div class="res-tenure-row">
          <div class="avatar avatar-sm" style="background:${avatarColor(r.name)};width:24px;height:24px;font-size:9px;">${initials(r.name)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:500;">${escapeHtml(r.name)}</div>
            <div class="tenure-bar-wrap">
              <div class="tenure-bar" style="width:${Math.round(r.leaseDays / sorted[0].leaseDays * 100)}%;background:${avatarColor(r.name)};"></div>
            </div>
          </div>
          <div style="font-size:11px;color:var(--text-3);white-space:nowrap;flex-shrink:0;">${Math.floor(r.leaseDays / 30)}mo</div>
        </div>`).join('')}
    </div>`;
}

// ── Room Rent Table ───────────────────────────────────────────
// Ch5: Array.sort() — sorted by rent
// Ch6: for...of loop for table rows

function renderRoomRentTable() {
  const tbody = document.getElementById('room-rent-tbody');
  if (!tbody) return;

  // Ch5: Array.sort() — highest rent first
  const rooms = RoomStorage.getAll()
    .sort((a, b) => b.monthlyRent - a.monthlyRent);

  if (!rooms.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:var(--s6);">No rooms.</td></tr>';
    return;
  }

  // Ch5: Array.map() to find tenants per room
  const residents = ResidentStorage.getAll();

  // Ch5: Array.reduce() — get max rent for bar scaling
  const maxRent = rooms.reduce((m, r) => Math.max(m, r.monthlyRent), 0);

  // Ch6: for...of loop — build table rows
  const rows = [];
  for (const room of rooms) {
    const tenant = residents.find(r => r.roomNumber === room.roomNumber);
    // Ch3: division * 100 — percentage for mini bar
    const pct = maxRent > 0 ? (room.monthlyRent / maxRent * 100) : 0;
    rows.push(`
      <tr>
        <td><span class="mono" style="font-weight:700;">${escapeHtml(room.roomNumber)}</span></td>
        <td style="color:var(--text-2);font-size:11px;">${escapeHtml(room.type)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:4px;background:var(--bg);border-radius:2px;min-width:60px;">
              <div style="height:100%;width:${pct.toFixed(1)}%;background:var(--blue);border-radius:2px;"></div>
            </div>
            <span style="font-size:12px;font-weight:600;">${formatCurrency(room.monthlyRent)}</span>
          </div>
        </td>
        <td>${roomStatusBadge(room.status)}</td>
        <td style="font-size:11px;color:var(--text-2);">
          ${tenant ? escapeHtml(tenant.name) : '<span style="color:var(--text-3);">Vacant</span>'}
        </td>
      </tr>`);
  }
  tbody.innerHTML = rows.join('');
}
