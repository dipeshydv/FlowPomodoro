/* ==========================================================================
   FLOWPOMODORO PLATFORM — UI Helpers
   Toast, modal, confirm dialog, and formatting utilities
   ========================================================================== */

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'pf-toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 * @param {number} duration ms
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `pf-toast ${type}`;

  const iconMap = { info: '💡', success: '✅', error: '❌' };
  toast.innerHTML = `<span>${iconMap[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
/**
 * Open a modal overlay (adds 'open' class)
 * @param {string|HTMLElement} modalOrId
 */
export function openModal(modalOrId) {
  const el = typeof modalOrId === 'string'
    ? document.getElementById(modalOrId)
    : modalOrId;
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Close on backdrop click
  el.addEventListener('click', function handler(e) {
    if (e.target === el) {
      closeModal(el);
      el.removeEventListener('click', handler);
    }
  });

  // Close on Escape
  function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal(el);
      document.removeEventListener('keydown', escHandler);
    }
  }
  document.addEventListener('keydown', escHandler);
}

/**
 * Close a modal overlay
 * @param {string|HTMLElement} modalOrId
 */
export function closeModal(modalOrId) {
  const el = typeof modalOrId === 'string'
    ? document.getElementById(modalOrId)
    : modalOrId;
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

/**
 * Wire close buttons inside a modal
 * @param {HTMLElement} modalEl
 */
export function wireModalClose(modalEl) {
  modalEl.querySelectorAll('[data-close-modal], .pf-modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(modalEl));
  });
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
let confirmResolve = null;

function ensureConfirmDialog() {
  if (document.getElementById('pf-confirm-overlay')) return;
  const div = document.createElement('div');
  div.id = 'pf-confirm-overlay';
  div.innerHTML = `
    <div class="pf-confirm-box">
      <div class="pf-confirm-icon" id="pf-confirm-icon">⚠️</div>
      <div class="pf-confirm-title" id="pf-confirm-title">Are you sure?</div>
      <div class="pf-confirm-msg" id="pf-confirm-msg"></div>
      <div class="pf-confirm-btns">
        <button class="btn-secondary" id="pf-confirm-cancel">Cancel</button>
        <button class="btn-danger" id="pf-confirm-ok">Confirm</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);

  document.getElementById('pf-confirm-cancel').addEventListener('click', () => {
    div.classList.remove('open');
    document.body.style.overflow = '';
    if (confirmResolve) { confirmResolve(false); confirmResolve = null; }
  });

  document.getElementById('pf-confirm-ok').addEventListener('click', () => {
    div.classList.remove('open');
    document.body.style.overflow = '';
    if (confirmResolve) { confirmResolve(true); confirmResolve = null; }
  });
}

/**
 * Show a confirm dialog. Returns Promise<boolean>
 * @param {string} message
 * @param {string} title
 * @param {string} icon
 */
export function confirm(message, title = 'Are you sure?', icon = '⚠️') {
  ensureConfirmDialog();
  document.getElementById('pf-confirm-title').textContent = title;
  document.getElementById('pf-confirm-msg').textContent = message;
  document.getElementById('pf-confirm-icon').textContent = icon;
  const overlay = document.getElementById('pf-confirm-overlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  return new Promise(resolve => { confirmResolve = resolve; });
}

// ─── Formatters ───────────────────────────────────────────────────────────────
/**
 * Format minutes → "2h 30m" or "45m"
 */
export function formatMinutes(mins) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format a YYYY-MM-DD date string → "Mon, Aug 30"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Format a YYYY-MM-DD date string → "August 30, 2026"
 */
export function formatDateLong(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Format a local date consistently as YYYY-MM-DD (prevents timezone shift bugs)
 */
export function getLocalDateKey(date) {
  const d = date ? (typeof date === 'string' ? new Date(date.includes('T') ? date : date + 'T00:00:00') : new Date(date)) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Return today's local date as YYYY-MM-DD
 */
export function today() {
  return getLocalDateKey();
}

/**
 * Return the Monday of the current week as YYYY-MM-DD (local calendar)
 */
export function thisWeekStart(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return getLocalDateKey(d);
}

/**
 * Format "HH:MM" to "9:00 AM"
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Get time range string "9:00 – 10:00 AM"
 */
export function formatTimeRange(startTime, endTime) {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
}

/**
 * Compute block duration in minutes
 */
export function blockDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

/**
 * Clamp a number
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Get an array of last N day strings (YYYY-MM-DD), most recent last
 */
export function lastNDays(n) {
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().split('T')[0]);
  }
  return arr;
}

/**
 * Get day-of-week letter (M T W T F S S)
 */
export function dayLetter(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return ['S','M','T','W','T','F','S'][d.getDay()];
}

/**
 * Lighten a hex color by mixing with white
 */
export function colorWithOpacity(hex, opacity = 0.15) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

/**
 * Render a progress bar in a container element
 * @param {HTMLElement} el  
 * @param {number} pct 0-100
 * @param {string} color hex
 */
export function renderProgressBar(el, pct, color = '#FFB800') {
  const clamped = clamp(pct, 0, 100);
  el.innerHTML = `
    <div class="progress-track">
      <div class="progress-fill" style="width:${clamped}%;background:${color};"></div>
    </div>
  `;
}

/**
 * Render a small stat ring SVG
 * @param {HTMLElement} el 
 * @param {number} pct 0-100
 * @param {string} color hex
 */
export function renderStatRing(el, pct, color = '#FFB800') {
  const clamped = clamp(pct, 0, 100);
  const r = 19;
  const circ = 2 * Math.PI * r; // 119.38
  const offset = circ - (clamped / 100) * circ;
  el.innerHTML = `
    <svg class="stat-ring-svg" viewBox="0 0 44 44">
      <circle class="stat-ring-bg" cx="22" cy="22" r="${r}"/>
      <circle class="stat-ring-progress" cx="22" cy="22" r="${r}"
        style="stroke:${color};stroke-dasharray:${circ.toFixed(2)};stroke-dashoffset:${offset.toFixed(2)};"/>
    </svg>
    <div class="stat-ring-pct">${Math.round(clamped)}%</div>
  `;
}
