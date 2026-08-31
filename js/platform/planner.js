/* ==========================================================================
   FLOWPOMODORO — Flexible Planner Page JS
   Continuous Timeline with arbitrary times, configurable Day/Night range,
   overlap prevention, recurring blocks, and 7-day week planner.
   ========================================================================== */

import { initSidebar } from '/js/platform/sidebar.js';
import { GoalStore, BlockStore, SettingsStore, SessionStore } from '/js/platform/store.js';
import { showToast, openModal, closeModal, confirm, formatDateLong, formatTime, formatTimeRange, formatMinutes, today } from '/js/platform/ui-helpers.js';

// ─── Planner State ───────────────────────────────────────────────────────────
let currentView = 'day'; // 'day' | 'week' | 'month'
let selectedDate = new Date(); // active cursor
let pendingBlockToSave = null; // for overlap modal confirmation
let recurringBlockDays = [0, 1, 2, 3, 4, 5, 6];

// ─── DOM References ──────────────────────────────────────────────────────────
const container = document.getElementById('planner-view-container');
const dateLabel = document.getElementById('active-date-label');
const prevBtn = document.getElementById('prev-date-btn');
const nextBtn = document.getElementById('next-date-btn');
const todayBtn = document.getElementById('today-btn');
const viewTabs = document.querySelectorAll('.planner-view-btn');
const rangeSelect = document.getElementById('planner-range-select');
const intervalSelect = document.getElementById('planner-interval-select');

// Modal Elements
const modal = document.getElementById('planner-block-modal');
const form = document.getElementById('p-block-form');
const modalTitle = document.getElementById('p-modal-title');
const blockIdInput = document.getElementById('p-block-id');
const blockTitleInput = document.getElementById('p-block-title');
const blockGoalInput = document.getElementById('p-block-goal');
const blockDateInput = document.getElementById('p-block-date');
const blockStartInput = document.getElementById('p-block-start');
const blockEndInput = document.getElementById('p-block-end');
const blockTypeInput = document.getElementById('p-block-type');
const blockRecurrenceSelect = document.getElementById('p-block-recurrence');
const blockDayPillsWrap = document.getElementById('p-block-day-pills-wrap');
const blockDayPills = document.getElementById('p-block-day-pills');
const blockNotesInput = document.getElementById('p-block-notes');
const durationHint = document.getElementById('p-duration-hint');
const deleteBtn = document.getElementById('p-delete-btn');

// Overlap Modal
const overlapModal = document.getElementById('planner-overlap-modal');
const overlapList = document.getElementById('overlap-conflicts-list');
const overlapAdjustBtn = document.getElementById('overlap-adjust-btn');
const overlapSaveAnywayBtn = document.getElementById('overlap-save-anyway-btn');
const overlapCancelBtn = document.getElementById('overlap-cancel-btn');

// ─── Helper Functions ─────────────────────────────────────────────────────────
function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToMins(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minsToTime(totalMins) {
  const norm = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getEffectivePlannerBounds() {
  const settings = SettingsStore.get();
  const startStr = settings.plannerStart || '06:00';
  const endStr = settings.plannerEnd || '23:00';

  const startMins = timeToMins(startStr);
  let endMins = timeToMins(endStr);

  // If end is 00:00 or end <= start, treat as cross-midnight or 24h
  if (endStr === '24:00' || (endStr === '00:00' && startStr === '00:00')) {
    return { startMins: 0, endMins: 1440, totalMins: 1440, isCrossMidnight: false };
  }

  if (endMins <= startMins) {
    endMins += 1440; // spans across midnight
    return { startMins, endMins, totalMins: endMins - startMins, isCrossMidnight: true };
  }

  return { startMins, endMins, totalMins: endMins - startMins, isCrossMidnight: false };
}

function updateDateLabel() {
  if (!dateLabel) return;
  const dateStr = toDateStr(selectedDate);

  if (currentView === 'day') {
    dateLabel.textContent = formatDateLong(dateStr);
  } else if (currentView === 'week') {
    const settings = SettingsStore.get();
    const firstDayOfWeek = settings.firstDayOfWeek ?? 1; // 0=Sun, 1=Mon

    const day = selectedDate.getDay();
    const diff = (day < firstDayOfWeek ? day + 7 : day) - firstDayOfWeek;
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    dateLabel.textContent = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else if (currentView === 'month') {
    dateLabel.textContent = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}

// ─── Populate Goal Select ────────────────────────────────────────────────────
function populateGoalSelect(selectedId = '') {
  if (!blockGoalInput) return;
  const goals = GoalStore.getActive();
  blockGoalInput.innerHTML = `
    <option value="">— No goal (Break / Flexible) —</option>
    ${goals.map(g => `
      <option value="${g.id}" ${g.id === selectedId ? 'selected' : ''}>
        ${g.icon || '🎯'} ${g.name} (${g.category || 'General'})
      </option>
    `).join('')}
  `;
}

// ─── Recurrence Day Pills in Block Modal ──────────────────────────────────────
function updateBlockDayPillsUI() {
  if (!blockDayPills) return;
  blockDayPills.querySelectorAll('.day-pill').forEach(btn => {
    const d = parseInt(btn.dataset.day);
    btn.classList.toggle('selected', recurringBlockDays.includes(d));
  });
}

function setupBlockRecurrenceUI() {
  blockRecurrenceSelect?.addEventListener('change', () => {
    const val = blockRecurrenceSelect.value;
    if (val === 'selected_days') {
      if (blockDayPillsWrap) blockDayPillsWrap.style.display = 'block';
    } else {
      if (blockDayPillsWrap) blockDayPillsWrap.style.display = 'none';
      if (val === 'daily') recurringBlockDays = [0, 1, 2, 3, 4, 5, 6];
      else if (val === 'weekdays') recurringBlockDays = [1, 2, 3, 4, 5];
      else if (val === 'weekends') recurringBlockDays = [0, 6];
      updateBlockDayPillsUI();
    }
  });

  blockDayPills?.querySelectorAll('.day-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = parseInt(btn.dataset.day);
      if (recurringBlockDays.includes(d)) {
        if (recurringBlockDays.length > 1) {
          recurringBlockDays = recurringBlockDays.filter(day => day !== d);
        }
      } else {
        recurringBlockDays.push(d);
        recurringBlockDays.sort((a, b) => a - b);
      }
      updateBlockDayPillsUI();
    });
  });
}

// ─── Duration Hint & Presets ──────────────────────────────────────────────────
function updateDurationHint() {
  if (!durationHint || !blockStartInput || !blockEndInput) return;
  const startM = timeToMins(blockStartInput.value);
  let endM = timeToMins(blockEndInput.value);
  if (endM <= startM) endM += 1440; // overnight
  const diff = endM - startM;
  durationHint.textContent = `Duration: ${diff} mins (${formatMinutes(diff)})`;
}

function setupDurationShortcuts() {
  document.querySelectorAll('.btn-duration-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const addMins = parseInt(btn.dataset.mins) || 60;
      const startM = timeToMins(blockStartInput.value || '08:00');
      const newEndM = startM + addMins;
      blockEndInput.value = minsToTime(newEndM);
      updateDurationHint();
    });
  });

  blockStartInput?.addEventListener('input', updateDurationHint);
  blockEndInput?.addEventListener('input', updateDurationHint);
}

// ─── Range & Interval Selectors in Toolbar ────────────────────────────────────
function setupToolbarSelectors() {
  const settings = SettingsStore.get();

  if (rangeSelect) {
    // Determine active option
    const curStart = settings.plannerStart || '06:00';
    const curEnd = settings.plannerEnd || '23:00';

    if (curStart === '05:00' && curEnd === '21:00') rangeSelect.value = 'early';
    else if (curStart === '09:00' && curEnd === '02:00') rangeSelect.value = 'late';
    else if (curStart === '08:00' && curEnd === '18:00') rangeSelect.value = 'work';
    else if (curStart === '00:00' && (curEnd === '24:00' || curEnd === '00:00')) rangeSelect.value = '24h';
    else rangeSelect.value = 'custom';

    rangeSelect.addEventListener('change', () => {
      const v = rangeSelect.value;
      if (v === 'early') SettingsStore.save({ plannerStart: '05:00', plannerEnd: '21:00' });
      else if (v === 'late') SettingsStore.save({ plannerStart: '09:00', plannerEnd: '02:00' });
      else if (v === 'work') SettingsStore.save({ plannerStart: '08:00', plannerEnd: '18:00' });
      else if (v === '24h') SettingsStore.save({ plannerStart: '00:00', plannerEnd: '24:00' });
      else SettingsStore.save({ plannerStart: '06:00', plannerEnd: '23:00' });

      render();
    });
  }

  if (intervalSelect) {
    intervalSelect.value = String(settings.plannerInterval || 15);
    intervalSelect.addEventListener('change', () => {
      SettingsStore.save({ plannerInterval: parseInt(intervalSelect.value) || 15 });
      render();
    });
  }
}

// ─── Render Current View ──────────────────────────────────────────────────────
function render() {
  updateDateLabel();
  if (currentView === 'day') renderDayView();
  else if (currentView === 'week') renderWeekView();
  else if (currentView === 'month') renderMonthView();
}

// ─── DAY VIEW (Continuous Scaled Timeline) ────────────────────────────────────
function renderDayView() {
  const dateStr = toDateStr(selectedDate);
  const blocks = BlockStore.getByDate(dateStr);
  const scheduledGoals = GoalStore.getScheduledForDate(dateStr);

  const bounds = getEffectivePlannerBounds();
  const { startMins, endMins, totalMins } = bounds;

  const pxPerMin = 1.15; // smooth proportional height
  const totalHeightPx = Math.round(totalMins * pxPerMin);

  // Build Time Ruler Hour Markers
  const hourLabels = [];
  const gridLines = [];

  const startHour = Math.floor(startMins / 60);
  const endHour = Math.ceil(endMins / 60);

  for (let h = startHour; h <= endHour; h++) {
    const curHourMins = h * 60;
    const offsetFromStart = curHourMins - startMins;
    if (offsetFromStart < 0 || offsetFromStart > totalMins) continue;

    const topPx = Math.round(offsetFromStart * pxPerMin);
    const normalizedH = ((h % 24) + 24) % 24;
    const timeLabel = formatTime(`${String(normalizedH).padStart(2, '0')}:00`);

    hourLabels.push(`
      <div class="timeline-hour-marker" style="top:${topPx}px;">
        <span>${timeLabel}</span>
      </div>
    `);

    gridLines.push(`
      <div class="timeline-grid-line" style="top:${topPx}px;"></div>
    `);
  }

  // Render Placed Time Blocks
  const blockElements = blocks.map(b => {
    let bStart = timeToMins(b.startTime);
    let bEnd = timeToMins(b.endTime);
    if (bEnd <= bStart) bEnd += 1440; // overnight duration

    // Normalize relative to timeline start
    let offsetMins = bStart - startMins;
    if (bounds.isCrossMidnight && offsetMins < 0) offsetMins += 1440;

    const durationM = bEnd - bStart;
    const topPx = Math.max(0, Math.round(offsetMins * pxPerMin));
    const heightPx = Math.max(30, Math.round(durationM * pxPerMin));

    let goal = null;
    if (b.goalId) goal = GoalStore.get(b.goalId);

    const isBreak = b.type === 'break' || (!b.goalId && b.title.toLowerCase().includes('break'));
    const color = b.color || goal?.color || (isBreak ? '#22d3a0' : '#FFB800');

    return `
      <div class="timeline-block ${isBreak ? 'type-break' : ''}"
           data-id="${b.id}"
           style="top:${topPx}px;height:${heightPx}px;border-left-color:${color};background:${color}18;"
           title="${b.title} (${b.startTime} – ${b.endTime})">
        <div class="timeline-block-header">
          <span class="timeline-block-title">${goal ? (goal.icon || '🎯') + ' ' : ''}${b.title}</span>
          <span class="timeline-block-badge">${formatMinutes(durationM)}</span>
        </div>
        <div class="timeline-block-time">
          <i class="fas fa-clock" style="font-size:9px;margin-right:2px;"></i> ${b.startTime} – ${b.endTime}
          ${b.notes ? ` • <span style="opacity:0.8;">${b.notes}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Current Time Indicator Line (Only on today)
  let currentTimeLineHTML = '';
  const todayStr = today();
  if (dateStr === todayStr) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let offsetNow = nowMins - startMins;
    if (bounds.isCrossMidnight && offsetNow < 0) offsetNow += 1440;

    if (offsetNow >= 0 && offsetNow <= totalMins) {
      const nowTopPx = Math.round(offsetNow * pxPerMin);
      const nowTimeStr = formatTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      currentTimeLineHTML = `
        <div class="timeline-now-line" style="top:${nowTopPx}px;" title="Current Time: ${nowTimeStr}">
          <div class="timeline-now-badge">NOW ${nowTimeStr}</div>
        </div>
      `;
    }
  }

  // Daily Scheduled Goals Ribbon
  const goalsRibbonHTML = scheduledGoals.length ? `
    <div class="planner-goals-ribbon">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">
        Scheduled Goals for ${formatDateLong(dateStr)}:
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${scheduledGoals.map(g => {
          const doneMins = SessionStore.todayMinutesForGoal(g.id);
          const color = g.color || '#FFB800';
          return `
            <div class="planner-goal-pill" style="border-left:3px solid ${color};">
              <span>${g.icon || '🎯'}</span>
              <strong style="margin:0 4px;">${g.name}</strong>
              <span style="font-size:11px;color:var(--text-muted);">${formatMinutes(doneMins)} / ${formatMinutes(g.dailyTarget)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    ${goalsRibbonHTML}
    <div class="day-timeline-container">
      <div class="timeline-ruler" style="height:${totalHeightPx}px;">
        ${hourLabels.join('')}
      </div>
      <div class="timeline-canvas" style="height:${totalHeightPx}px;">
        ${gridLines.join('')}
        ${currentTimeLineHTML}
        ${blockElements}
      </div>
    </div>
  `;

  // Bind Block Clicks
  container.querySelectorAll('.timeline-block').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditBlockModal(el.dataset.id);
    });
  });

  // Clicking empty timeline snaps to interval and creates block
  const canvas = container.querySelector('.timeline-canvas');
  canvas?.addEventListener('click', (e) => {
    if (e.target.closest('.timeline-block')) return;
    const rect = canvas.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const clickedMinsFromTop = offsetY / pxPerMin;
    const targetTotalMins = startMins + clickedMinsFromTop;

    // Snap to interval
    const interval = SettingsStore.get().plannerInterval || 15;
    const snappedMins = Math.floor(targetTotalMins / interval) * interval;
    const endMins = snappedMins + 60;

    openCreateBlockModal(minsToTime(snappedMins), minsToTime(endMins));
  });
}

// ─── WEEK VIEW (7-Day Column Grid) ────────────────────────────────────────────
function renderWeekView() {
  const settings = SettingsStore.get();
  const firstDayOfWeek = settings.firstDayOfWeek ?? 1; // 0=Sun, 1=Mon

  const day = selectedDate.getDay();
  const diff = (day < firstDayOfWeek ? day + 7 : day) - firstDayOfWeek;
  const start = new Date(selectedDate);
  start.setDate(selectedDate.getDate() - diff);

  const todayStr = today();
  const columns = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dStr = toDateStr(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const isToday = dStr === todayStr;

    const dayBlocks = BlockStore.getByDate(dStr);
    const scheduledGoals = GoalStore.getScheduledForDate(dStr);
    const restHabits = GoalStore.getRestDaysForDate(dStr);

    const blockChips = dayBlocks.map(b => {
      let goal = null;
      if (b.goalId) goal = GoalStore.get(b.goalId);
      const isBreak = b.type === 'break' || (!b.goalId && b.title.toLowerCase().includes('break'));
      const color = b.color || goal?.color || (isBreak ? '#22d3a0' : '#FFB800');

      return `
        <div class="week-block-chip" style="border-left-color:${color};" title="${b.title} (${b.startTime} – ${b.endTime})">
          <div style="font-weight:700;">${b.title}</div>
          <div style="font-size:10px;color:var(--text-muted);">${b.startTime} – ${b.endTime}</div>
        </div>
      `;
    }).join('');

    const goalsChips = scheduledGoals.map(g => `
      <span class="week-goal-dot-badge" style="border-color:${g.color || '#FFB800'};" title="${g.name}">
        ${g.icon || '🎯'} ${g.name}
      </span>
    `).join('');

    const restChips = restHabits.map(g => `
      <span class="week-rest-badge" title="Rest day for ${g.name}">
        <i class="fas fa-bed"></i> ${g.name} (Rest)
      </span>
    `).join('');

    columns.push(`
      <div class="week-col ${isToday ? 'today-col' : ''}" data-date="${dStr}">
        <div class="week-col-header">
          <div class="week-col-day">${dayName}</div>
          <div class="week-col-num">${dayNum}</div>
        </div>
        <div class="week-col-body">
          ${goalsChips || restChips ? `
            <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed var(--border-color);">
              ${goalsChips}
              ${restChips}
            </div>
          ` : ''}
          ${blockChips || '<span style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:16px;">No blocks</span>'}
        </div>
      </div>
    `);
  }

  container.innerHTML = `
    <div class="week-grid">
      ${columns.join('')}
    </div>
  `;

  // Click Column to drill into Day view
  container.querySelectorAll('.week-col').forEach(col => {
    col.addEventListener('click', () => {
      selectedDate = new Date(col.dataset.date + 'T00:00:00');
      currentView = 'day';
      updateViewTabs();
      render();
    });
  });
}

// ─── MONTH VIEW ──────────────────────────────────────────────────────────────
function renderMonthView() {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const todayStr = today();

  const settings = SettingsStore.get();
  const firstDayOfWeek = settings.firstDayOfWeek ?? 1;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startOffset = (firstDay.getDay() < firstDayOfWeek ? firstDay.getDay() + 7 : firstDay.getDay()) - firstDayOfWeek;

  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
  const cells = [];

  const baseDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNames = firstDayOfWeek === 1 
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] 
    : baseDays;

  const headers = dayNames.map(n => `<div class="month-day-name">${n}</div>`).join('');

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    const cellDate = new Date(year, month, dayNum);
    const dStr = toDateStr(cellDate);
    const isCurrentMonth = dayNum > 0 && dayNum <= lastDay.getDate();
    const isToday = dStr === todayStr;
    const blocks = BlockStore.getByDate(dStr);

    const dots = blocks.slice(0, 4).map(b => {
      let goal = null;
      if (b.goalId) goal = GoalStore.get(b.goalId);
      const color = b.color || goal?.color || '#FFB800';
      return `<span class="month-block-dot" style="background:${color};" title="${b.title} (${b.startTime})"></span>`;
    }).join(' ');

    const moreText = blocks.length > 4 ? `<span style="font-size:9px;color:var(--text-muted);">+${blocks.length - 4}</span>` : '';

    cells.push(`
      <div class="month-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''}" data-date="${dStr}">
        <div class="month-cell-num">${cellDate.getDate()}</div>
        <div style="display:flex;gap:3px;align-items:center;flex-wrap:wrap;margin-top:auto;">
          ${dots} ${moreText}
        </div>
      </div>
    `);
  }

  container.innerHTML = `
    <div class="month-grid">
      ${headers}
      ${cells.join('')}
    </div>
  `;

  container.querySelectorAll('.month-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      selectedDate = new Date(cell.dataset.date + 'T00:00:00');
      currentView = 'day';
      updateViewTabs();
      render();
    });
  });
}

function updateViewTabs() {
  viewTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === currentView);
  });
}

// ─── Modal Openers ────────────────────────────────────────────────────────────
function openCreateBlockModal(startTime = '08:15', endTime = '09:45') {
  modalTitle.textContent = 'Schedule Time Block';
  form.reset();
  blockIdInput.value = '';
  blockDateInput.value = toDateStr(selectedDate);
  blockStartInput.value = startTime;
  blockEndInput.value = endTime;
  blockTypeInput.value = 'focus';
  if (blockRecurrenceSelect) blockRecurrenceSelect.value = 'none';
  if (blockDayPillsWrap) blockDayPillsWrap.style.display = 'none';
  recurringBlockDays = [0, 1, 2, 3, 4, 5, 6];
  updateBlockDayPillsUI();
  deleteBtn.style.display = 'none';
  populateGoalSelect('');
  updateDurationHint();
  openModal(modal);
}

function openEditBlockModal(id) {
  const all = BlockStore.getAll();
  const block = all.find(b => b.id === id);
  if (!block) return;

  modalTitle.textContent = 'Edit Time Block';
  blockIdInput.value = block.id;
  blockTitleInput.value = block.title || '';
  blockDateInput.value = block.date || toDateStr(selectedDate);
  blockStartInput.value = block.startTime || '08:15';
  blockEndInput.value = block.endTime || '09:45';
  blockTypeInput.value = block.type || 'focus';
  blockNotesInput.value = block.notes || '';
  
  if (blockRecurrenceSelect) {
    blockRecurrenceSelect.value = block.isRecurring ? (block.recurrenceType || 'daily') : 'none';
    if (blockDayPillsWrap) {
      blockDayPillsWrap.style.display = block.recurrenceType === 'selected_days' ? 'block' : 'none';
    }
  }
  recurringBlockDays = Array.isArray(block.selectedDays) && block.selectedDays.length > 0 ? block.selectedDays : [0, 1, 2, 3, 4, 5, 6];
  updateBlockDayPillsUI();

  deleteBtn.style.display = 'inline-flex';
  populateGoalSelect(block.goalId || '');
  updateDurationHint();
  openModal(modal);
}

// ─── Overlap Warning Modal Handling ──────────────────────────────────────────
function showOverlapWarning(conflicts, blockData) {
  pendingBlockToSave = blockData;
  if (!overlapList) return;

  overlapList.innerHTML = conflicts.map(c => `
    <div style="background:var(--bg-surface-hover);border-left:3px solid #FF6B6B;padding:8px 12px;border-radius:var(--radius-sm);font-size:12px;">
      <div style="font-weight:700;color:var(--text-primary);">${c.title}</div>
      <div style="color:var(--text-muted);font-size:11px;margin-top:2px;">
        <i class="fas fa-clock"></i> ${c.startTime} – ${c.endTime}
      </div>
    </div>
  `).join('');

  closeModal(modal);
  openModal(overlapModal);
}

function setupOverlapModalListeners() {
  overlapAdjustBtn?.addEventListener('click', () => {
    closeModal(overlapModal);
    if (pendingBlockToSave) {
      openModal(modal);
    }
  });

  overlapSaveAnywayBtn?.addEventListener('click', () => {
    if (pendingBlockToSave) {
      BlockStore.save(pendingBlockToSave);
      closeModal(overlapModal);
      showToast('Block scheduled (overlap allowed) ✓', 'success');
      pendingBlockToSave = null;
      render();
    }
  });

  overlapCancelBtn?.addEventListener('click', () => {
    pendingBlockToSave = null;
    closeModal(overlapModal);
  });

  document.getElementById('overlap-modal-close')?.addEventListener('click', () => {
    pendingBlockToSave = null;
    closeModal(overlapModal);
  });
}

// ─── Form Submission ──────────────────────────────────────────────────────────
function setupForm() {
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = blockTitleInput.value.trim();
    if (!title) {
      showToast('Please enter a title', 'error');
      return;
    }

    const recurrence = blockRecurrenceSelect ? blockRecurrenceSelect.value : 'none';
    const isRecurring = recurrence !== 'none';

    const blockData = {
      id: blockIdInput.value || undefined,
      title,
      goalId: blockGoalInput.value || null,
      date: blockDateInput.value,
      startTime: blockStartInput.value,
      endTime: blockEndInput.value,
      type: blockTypeInput.value || 'focus',
      isRecurring: isRecurring,
      recurrenceType: recurrence,
      selectedDays: isRecurring ? recurringBlockDays : [],
      notes: blockNotesInput.value.trim()
    };

    // Check for Overlap
    const settings = SettingsStore.get();
    const conflicts = BlockStore.checkOverlap(blockData, blockData.id);

    if (conflicts.length > 0 && settings.warnOverlap !== false) {
      showOverlapWarning(conflicts, blockData);
      return;
    }

    BlockStore.save(blockData);
    closeModal(modal);
    showToast(blockData.id ? 'Block updated ✓' : 'Block scheduled ✓', 'success');
    render();
  });

  deleteBtn?.addEventListener('click', async () => {
    const id = blockIdInput.value;
    if (!id) return;
    const ok = await confirm('Delete this scheduled block?', 'Delete Block', '🗑️');
    if (ok) {
      BlockStore.delete(id);
      closeModal(modal);
      showToast('Block removed', 'info');
      render();
    }
  });

  document.getElementById('p-modal-close')?.addEventListener('click', () => closeModal(modal));
  document.getElementById('p-cancel-btn')?.addEventListener('click', () => closeModal(modal));
}

// ─── Navigation Buttons ───────────────────────────────────────────────────────
function setupNav() {
  prevBtn?.addEventListener('click', () => {
    if (currentView === 'day') selectedDate.setDate(selectedDate.getDate() - 1);
    else if (currentView === 'week') selectedDate.setDate(selectedDate.getDate() - 7);
    else if (currentView === 'month') selectedDate.setMonth(selectedDate.getMonth() - 1);
    render();
  });

  nextBtn?.addEventListener('click', () => {
    if (currentView === 'day') selectedDate.setDate(selectedDate.getDate() + 1);
    else if (currentView === 'week') selectedDate.setDate(selectedDate.getDate() + 7);
    else if (currentView === 'month') selectedDate.setMonth(selectedDate.getMonth() + 1);
    render();
  });

  todayBtn?.addEventListener('click', () => {
    selectedDate = new Date();
    render();
  });

  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      currentView = tab.dataset.view;
      updateViewTabs();
      render();
    });
  });
}

// ─── Init Page ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar({
    pageId: 'planner',
    pageTitle: 'Planner',
    pageSubtitle: 'Visual time-blocking and custom schedule planner',
    actionsHTML: `
      <button class="btn-primary" id="open-add-block-topbar">
        <i class="fas fa-plus"></i> Add Block
      </button>
    `
  });

  document.getElementById('open-add-block-topbar')?.addEventListener('click', () => openCreateBlockModal());

  setupToolbarSelectors();
  setupDurationShortcuts();
  setupBlockRecurrenceUI();
  setupOverlapModalListeners();
  setupForm();
  setupNav();
  render();

  // Live minute ticker for current time line
  setInterval(() => {
    if (currentView === 'day' && toDateStr(selectedDate) === today()) {
      renderDayView();
    }
  }, 60000);
});

