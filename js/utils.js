/* ============================================================
   utils.js – Shared utility functions
   ============================================================ */

// ── Toast ─────────────────────────────────────────────────────

function showToast(message, type = 'success', duration = 3000) {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<div class="toast-pip"></div><span>${message}</span>`;
  root.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('in')));

  const dismiss = () => {
    toast.classList.remove('in');
    toast.classList.add('out');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  };

  const t = setTimeout(dismiss, duration);
  toast.addEventListener('click', () => { clearTimeout(t); dismiss(); });
}

// ── Modals ────────────────────────────────────────────────────

function openModal(el) {
  if (typeof el === 'string') el = document.querySelector(el);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(el) {
  if (typeof el === 'string') el = document.querySelector(el);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

function wireModalClose(overlay) {
  // Close buttons with data-close-modal
  overlay.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(overlay));
  });
  // Backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });
}

// ── Confirm ───────────────────────────────────────────────────

function showConfirm({ title = 'Confirm', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true } = {}) {
  return new Promise(resolve => {
    document.getElementById('_confirm_overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = '_confirm_overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal-sm">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(title)}</span>
          <button class="modal-close" id="_confirm_x">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4L4 12M4 4l8 8"/></svg>
          </button>
        </div>
        <div class="confirm-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="_confirm_cancel">${escapeHtml(cancelLabel)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="_confirm_ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    openModal(overlay);

    const done = val => {
      closeModal(overlay);
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      resolve(val);
    };

    overlay.querySelector('#_confirm_ok').addEventListener('click', () => done(true));
    overlay.querySelector('#_confirm_cancel').addEventListener('click', () => done(false));
    overlay.querySelector('#_confirm_x').addEventListener('click', () => done(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) done(false); });
  });
}

// ── Form Validation ───────────────────────────────────────────

function validateField(field, msg) {
  clearFieldError(field);
  if (!field.value.trim()) {
    setFieldError(field, msg);
    return false;
  }
  return true;
}

function validateEmail(field) {
  clearFieldError(field);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
    setFieldError(field, 'Enter a valid email address.');
    return false;
  }
  return true;
}

function setFieldError(field, msg) {
  field.classList.add('is-error');
  const existing = field.parentNode.querySelector('.form-error-msg');
  if (existing) return;
  const err = document.createElement('div');
  err.className = 'form-error-msg';
  err.textContent = msg;
  field.parentNode.appendChild(err);
}

function clearFieldError(field) {
  field.classList.remove('is-error');
  field.parentNode.querySelector('.form-error-msg')?.remove();
}

function clearFormErrors(form) {
  form.querySelectorAll('.is-error').forEach(f => f.classList.remove('is-error'));
  form.querySelectorAll('.form-error-msg').forEach(e => e.remove());
}

// ── Date Formatting ───────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}

// ── Badge helpers ─────────────────────────────────────────────

function roomStatusBadge(status) {
  const map = { available: ['badge-green', 'Available'], occupied: ['badge-red', 'Occupied'] };
  const [cls, label] = map[status] || ['badge-gray', capitalize(status)];
  return `<span class="badge ${cls}">${label}</span>`;
}

function maintStatusBadge(status) {
  const map = {
    pending:     ['badge-amber',  'Pending'],
    'in-progress': ['badge-blue', 'In Progress'],
    completed:   ['badge-green',  'Completed'],
  };
  const [cls, label] = map[status] || ['badge-gray', capitalize(status)];
  return `<span class="badge ${cls}">${label}</span>`;
}

function priorityBadge(priority) {
  const map = { high: 'high', medium: 'medium', low: 'low' };
  return `<span class="priority-label"><span class="priority-dot ${map[priority] || 'low'}"></span>${capitalize(priority)}</span>`;
}

// ── Empty state ───────────────────────────────────────────────

function emptyHtml(iconPath, title, msg, action = '') {
  return `
    <div class="empty">
      <div class="empty-icon">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
      </div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(msg)}</p>
      ${action}
    </div>`;
}

// ── Misc ──────────────────────────────────────────────────────

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str ?? ''));
  return d.innerHTML;
}

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}

function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function stringToHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h % 360);
}

function avatarColor(name) { return `hsl(${stringToHue(name)}, 40%, 42%)`; }

function initials(name) { return (name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }
