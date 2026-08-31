/* ==========================================================================
   FLOWPOMODORO — Goals Page JS
   Handles Goal & Habit CRUD, 7-Day recurrence selector, active/archived tabs,
   color picker, and dynamic schedule progress.
   ========================================================================== */

import { initSidebar } from '/js/platform/sidebar.js';
import { GoalStore, SessionStore, today } from '/js/platform/store.js';
import { showToast, openModal, closeModal, confirm, formatMinutes } from '/js/platform/ui-helpers.js';

const GOAL_COLORS = ['#FFB800', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F39C12', '#3498DB', '#9B59B6'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let currentTab = 'all';
let currentSelectedDays = [0, 1, 2, 3, 4, 5, 6]; // 0=Sun..6=Sat

// ─── DOM References ──────────────────────────────────────────────────────────
const tableContainer = document.getElementById('goals-table-container');
const modal = document.getElementById('goal-modal');
const form = document.getElementById('goal-form');
const modalTitle = document.getElementById('goal-modal-title');
const goalIdInput = document.getElementById('goal-id');
const goalNameInput = document.getElementById('goal-name');
const goalIconInput = document.getElementById('goal-icon');
const iconPreview = document.getElementById('icon-preview');
const goalColorInput = document.getElementById('goal-color');
const goalCatInput = document.getElementById('goal-category');
const goalRecurrenceSelect = document.getElementById('goal-recurrence');
const daySelectorWrap = document.getElementById('day-selector-wrap');
const goalDayPills = document.getElementById('goal-day-pills');
const goalDailyInput = document.getElementById('goal-daily');
const goalWeeklyInput = document.getElementById('goal-weekly');
const goalStartDateInput = document.getElementById('goal-start-date');
const goalEndDateInput = document.getElementById('goal-end-date');
const goalDescInput = document.getElementById('goal-desc');
const dailyHint = document.getElementById('daily-hint');
const weeklyHint = document.getElementById('weekly-hint');
const swatchesContainer = document.getElementById('color-swatches');

// ─── Color Swatches Setup ────────────────────────────────────────────────────
function setupColorSwatches() {
  if (!swatchesContainer) return;
  swatchesContainer.innerHTML = GOAL_COLORS.map(c => `
    <div class="color-swatch ${c === goalColorInput.value ? 'selected' : ''}" 
         data-color="${c}" 
         style="background:${c};"></div>
  `).join('');

  swatchesContainer.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatchesContainer.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      goalColorInput.value = swatch.dataset.color;
      iconPreview.style.borderColor = swatch.dataset.color;
    });
  });
}

// ─── Priority Options Setup ──────────────────────────────────────────────────
function setupPriorityOptions() {
  const options = document.querySelectorAll('.priority-option');
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const radio = opt.querySelector('input');
      if (radio) radio.checked = true;
    });
  });
}

// ─── Goal Type Selector Setup (Habit vs Goal) ────────────────────────────────
function setupTypeOptions() {
  const typeHabit = document.getElementById('type-opt-habit');
  const typeGoal = document.getElementById('type-opt-goal');

  typeHabit?.addEventListener('click', () => {
    typeHabit.classList.add('selected');
    typeGoal?.classList.remove('selected');
    typeHabit.style.background = 'var(--bg-surface-hover)';
    if (typeGoal) typeGoal.style.background = 'transparent';
    const radio = typeHabit.querySelector('input');
    if (radio) radio.checked = true;

    if (daySelectorWrap) daySelectorWrap.style.display = 'block';
    if (goalRecurrenceSelect && goalRecurrenceSelect.value === 'none') {
      goalRecurrenceSelect.value = 'daily';
      setDayPills([0, 1, 2, 3, 4, 5, 6]);
    }
    updateTargetCalculations();
  });

  typeGoal?.addEventListener('click', () => {
    typeGoal.classList.add('selected');
    typeHabit?.classList.remove('selected');
    typeGoal.style.background = 'var(--bg-surface-hover)';
    if (typeHabit) typeHabit.style.background = 'transparent';
    const radio = typeGoal.querySelector('input');
    if (radio) radio.checked = true;

    if (goalRecurrenceSelect) goalRecurrenceSelect.value = 'none';
    if (daySelectorWrap) daySelectorWrap.style.display = 'none';
    updateTargetCalculations();
  });
}

// ─── 7-Day Selector and Presets ──────────────────────────────────────────────
function getSelectedType() {
  const checked = document.querySelector('input[name="goal-type"]:checked');
  return checked ? checked.value : 'habit';
}

function updateDayPillsUI() {
  if (!goalDayPills) return;
  goalDayPills.querySelectorAll('.day-pill').forEach(btn => {
    const day = parseInt(btn.dataset.day);
    btn.classList.toggle('selected', currentSelectedDays.includes(day));
  });
}

function setDayPills(days) {
  currentSelectedDays = [...days].sort((a, b) => a - b);
  updateDayPillsUI();
  updateTargetCalculations();
}

function setupDaySelector() {
  if (!goalDayPills) return;

  goalDayPills.querySelectorAll('.day-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day);
      if (currentSelectedDays.includes(day)) {
        // Prevent deselecting last day if habit
        if (currentSelectedDays.length > 1) {
          currentSelectedDays = currentSelectedDays.filter(d => d !== day);
        } else {
          showToast('Select at least one active day for a recurring habit', 'info');
          return;
        }
      } else {
        currentSelectedDays.push(day);
        currentSelectedDays.sort((a, b) => a - b);
      }
      
      // Update dropdown to custom if mismatch standard
      if (goalRecurrenceSelect) {
        if (currentSelectedDays.length === 7) goalRecurrenceSelect.value = 'daily';
        else if (JSON.stringify(currentSelectedDays) === JSON.stringify([1, 2, 3, 4, 5])) goalRecurrenceSelect.value = 'weekdays';
        else if (JSON.stringify(currentSelectedDays) === JSON.stringify([0, 6])) goalRecurrenceSelect.value = 'weekends';
        else goalRecurrenceSelect.value = 'selected_days';
      }

      updateDayPillsUI();
      updateTargetCalculations();
    });
  });

  // Presets
  document.querySelectorAll('.btn-preset-day').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      if (preset === 'all') {
        goalRecurrenceSelect.value = 'daily';
        setDayPills([0, 1, 2, 3, 4, 5, 6]);
      } else if (preset === 'weekdays') {
        goalRecurrenceSelect.value = 'weekdays';
        setDayPills([1, 2, 3, 4, 5]);
      } else if (preset === 'weekends') {
        goalRecurrenceSelect.value = 'weekends';
        setDayPills([0, 6]);
      } else if (preset === 'mwf') {
        goalRecurrenceSelect.value = 'selected_days';
        setDayPills([1, 3, 5]);
      } else if (preset === 'tt') {
        goalRecurrenceSelect.value = 'selected_days';
        setDayPills([2, 4]);
      }
    });
  });

  // Recurrence dropdown change
  goalRecurrenceSelect?.addEventListener('change', () => {
    const val = goalRecurrenceSelect.value;
    if (val === 'daily') {
      if (daySelectorWrap) daySelectorWrap.style.display = 'block';
      setDayPills([0, 1, 2, 3, 4, 5, 6]);
    } else if (val === 'weekdays') {
      if (daySelectorWrap) daySelectorWrap.style.display = 'block';
      setDayPills([1, 2, 3, 4, 5]);
    } else if (val === 'weekends') {
      if (daySelectorWrap) daySelectorWrap.style.display = 'block';
      setDayPills([0, 6]);
    } else if (val === 'none') {
      if (daySelectorWrap) daySelectorWrap.style.display = 'none';
      const typeGoal = document.getElementById('type-opt-goal');
      if (typeGoal) typeGoal.click();
    } else {
      if (daySelectorWrap) daySelectorWrap.style.display = 'block';
      updateTargetCalculations();
    }
  });
}

// ─── Target & Hints Live Calculation ─────────────────────────────────────────
function updateTargetCalculations() {
  const dailyMins = parseInt(goalDailyInput?.value) || 0;
  dailyHint.textContent = `= ${formatMinutes(dailyMins)} / day`;

  const numDays = (getSelectedType() === 'goal' || goalRecurrenceSelect?.value === 'none')
    ? 1
    : (currentSelectedDays.length || 7);

  const calculatedWeekly = dailyMins * numDays;
  if (goalWeeklyInput) {
    goalWeeklyInput.value = calculatedWeekly;
    weeklyHint.textContent = `= ${formatMinutes(calculatedWeekly)} / week (${numDays} active day${numDays === 1 ? '' : 's'})`;
  }
}

function setupHintUpdaters() {
  goalDailyInput?.addEventListener('input', () => {
    updateTargetCalculations();
  });

  goalWeeklyInput?.addEventListener('input', () => {
    const mins = parseInt(goalWeeklyInput.value) || 0;
    weeklyHint.textContent = `= ${formatMinutes(mins)} / week`;
  });

  goalIconInput?.addEventListener('input', () => {
    iconPreview.textContent = goalIconInput.value.trim() || '🎯';
  });
}

// ─── Render Helper: Recurrence Badge ─────────────────────────────────────────
function getRecurrenceLabel(g) {
  if (g.type === 'goal' || g.recurrenceType === 'none') {
    return `<span class="badge-recurrence outcome"><i class="fas fa-bullseye"></i> Outcome Goal</span>`;
  }

  const days = Array.isArray(g.selectedDays) ? g.selectedDays : [0, 1, 2, 3, 4, 5, 6];
  if (days.length === 7) {
    return `<span class="badge-recurrence daily"><i class="fas fa-repeat"></i> Every day (7d)</span>`;
  }
  if (JSON.stringify(days) === JSON.stringify([1, 2, 3, 4, 5])) {
    return `<span class="badge-recurrence weekdays"><i class="fas fa-calendar-week"></i> Weekdays (5d)</span>`;
  }
  if (JSON.stringify(days) === JSON.stringify([0, 6])) {
    return `<span class="badge-recurrence weekends"><i class="fas fa-mug-hot"></i> Weekends (2d)</span>`;
  }

  // Format custom short days e.g. "M • W • F"
  const shortDays = days.map(d => DAY_NAMES[d].slice(0, 1).toUpperCase()).join(' • ');
  return `<span class="badge-recurrence custom"><i class="fas fa-calendar-days"></i> ${shortDays} (${days.length}d)</span>`;
}

// ─── Render Goals Table ───────────────────────────────────────────────────────
function renderGoals() {
  const allGoals = GoalStore.getAll();
  const activeGoals = GoalStore.getActive();
  const archivedGoals = GoalStore.getArchived();

  // Update tab counts
  document.getElementById('count-all').textContent = allGoals.length;
  document.getElementById('count-active').textContent = activeGoals.length;
  document.getElementById('count-archived').textContent = archivedGoals.length;

  let goalsToRender = [];
  if (currentTab === 'active') goalsToRender = activeGoals;
  else if (currentTab === 'archived') goalsToRender = archivedGoals;
  else goalsToRender = allGoals;

  if (!goalsToRender.length) {
    tableContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <div class="empty-state-title">
          ${currentTab === 'archived' ? 'No archived goals' : 'No goals found'}
        </div>
        <div class="empty-state-desc">
          ${currentTab === 'archived' 
            ? 'Goals you archive will appear here for future reference.' 
            : 'Create flexible goals and habits with custom 7-day schedules and attach them to your focus sessions.'}
        </div>
        ${currentTab !== 'archived' ? `
          <button class="btn-primary" id="empty-add-btn">
            <i class="fas fa-plus"></i> Add Goal
          </button>
        ` : ''}
      </div>
    `;

    document.getElementById('empty-add-btn')?.addEventListener('click', openCreateModal);
    return;
  }

  const todayStr = today();

  const rows = goalsToRender.map(g => {
    const minsDone = SessionStore.todayMinutesForGoal(g.id);
    const target = g.dailyTarget || 60;
    const pct = Math.min(100, Math.round((minsDone / target) * 100));
    const color = g.color || '#FFB800';
    const isActive = g.isActive !== false;

    // Determine today's schedule status
    const isScheduled = GoalStore.isScheduledForDate(g, todayStr);
    const isRest = GoalStore.isRestDay(g, todayStr);
    const isSkipped = GoalStore.isSkippedForDate(g.id, todayStr);

    let scheduleChip = '';
    if (!isActive) {
      scheduleChip = `<span class="schedule-status-chip archived"><i class="fas fa-box-archive"></i> Archived</span>`;
    } else if (isSkipped) {
      scheduleChip = `<span class="schedule-status-chip skipped"><i class="fas fa-forward"></i> Skipped Today</span>`;
    } else if (isScheduled) {
      scheduleChip = pct >= 100 
        ? `<span class="schedule-status-chip done"><i class="fas fa-circle-check"></i> Done Today</span>`
        : `<span class="schedule-status-chip scheduled"><i class="fas fa-calendar-check"></i> Scheduled Today</span>`;
    } else if (isRest) {
      scheduleChip = `<span class="schedule-status-chip rest"><i class="fas fa-bed"></i> Rest Day</span>`;
    } else {
      scheduleChip = `<span class="schedule-status-chip flexible"><i class="fas fa-feather"></i> Flexible</span>`;
    }

    return `
      <tr data-id="${g.id}">
        <td>
          <div class="goal-cell">
            <div class="goal-table-icon" style="background:${color}20;color:${color};">
              ${g.icon || '🎯'}
            </div>
            <div>
              <div class="goal-table-name">${g.name}</div>
              <div style="display:flex;gap:6px;align-items:center;margin-top:2px;flex-wrap:wrap;">
                <span class="goal-table-category">${g.category || 'General'}</span>
                ${getRecurrenceLabel(g)}
              </div>
            </div>
          </div>
        </td>
        <td><strong>${formatMinutes(g.dailyTarget)}</strong></td>
        <td><span style="color:var(--text-secondary);font-weight:600;">${formatMinutes(g.weeklyTarget)}</span></td>
        <td>
          <div class="progress-cell">
            <div class="progress-mini-track">
              <div class="progress-mini-fill" style="width:${pct}%;background:${color};"></div>
            </div>
            <span style="font-weight:600;font-size:12px;">${pct}%</span>
          </div>
        </td>
        <td>
          ${scheduleChip}
        </td>
        <td>
          <div class="table-actions">
            ${isActive ? `
              <a href="/app/pomodoro.html?goalId=${g.id}" class="btn-primary btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;font-size:11px;" title="Start focus session for ${g.name}">
                <i class="fas fa-play"></i> Focus
              </a>
            ` : ''}
            <button class="table-action-btn edit-goal-btn" data-id="${g.id}" title="Edit goal">
              <i class="fas fa-pencil"></i>
            </button>
            <button class="table-action-btn toggle-archive-btn" data-id="${g.id}" title="${isActive ? 'Archive' : 'Restore'}">
              <i class="fas ${isActive ? 'fa-box-archive' : 'fa-arrow-rotate-left'}"></i>
            </button>
            <button class="table-action-btn danger delete-goal-btn" data-id="${g.id}" title="Delete goal">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tableContainer.innerHTML = `
    <div class="pf-table-wrap">
      <table class="pf-table">
        <thead>
          <tr>
            <th>Goal / Activity</th>
            <th>Daily Target</th>
            <th>Weekly Target</th>
            <th>Today's Progress</th>
            <th>Today's Schedule</th>
            <th style="width:110px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  // Bind row actions
  tableContainer.querySelectorAll('.edit-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  tableContainer.querySelectorAll('.toggle-archive-btn').forEach(btn => {
    btn.addEventListener('click', () => handleToggleArchive(btn.dataset.id));
  });

  tableContainer.querySelectorAll('.delete-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteGoal(btn.dataset.id));
  });
}

// ─── Modal Openers ────────────────────────────────────────────────────────────
function openCreateModal() {
  modalTitle.textContent = 'Create New Goal';
  form.reset();
  goalIdInput.value = '';
  goalIconInput.value = '🎯';
  iconPreview.textContent = '🎯';
  goalColorInput.value = '#FFB800';
  iconPreview.style.borderColor = '#FFB800';
  goalCatInput.value = 'General';
  goalDailyInput.value = 60;
  goalWeeklyInput.value = 420;
  if (goalStartDateInput) goalStartDateInput.value = '';
  if (goalEndDateInput) goalEndDateInput.value = '';
  if (goalDescInput) goalDescInput.value = '';

  // Default to Habit with all 7 days
  const typeHabit = document.getElementById('type-opt-habit');
  if (typeHabit) typeHabit.click();

  if (goalRecurrenceSelect) goalRecurrenceSelect.value = 'daily';
  setDayPills([0, 1, 2, 3, 4, 5, 6]);

  setupColorSwatches();
  
  // Set priority high by default
  document.querySelectorAll('.priority-option').forEach(o => o.classList.remove('selected'));
  document.querySelector('.priority-option[data-priority="high"]')?.classList.add('selected');
  const highRadio = document.querySelector('input[value="high"]');
  if (highRadio) highRadio.checked = true;

  openModal(modal);
}

function openEditModal(id) {
  const goal = GoalStore.get(id);
  if (!goal) return;

  modalTitle.textContent = 'Edit Goal';
  goalIdInput.value = goal.id;
  goalNameInput.value = goal.name || '';
  goalIconInput.value = goal.icon || '🎯';
  iconPreview.textContent = goal.icon || '🎯';
  goalColorInput.value = goal.color || '#FFB800';
  iconPreview.style.borderColor = goal.color || '#FFB800';
  goalCatInput.value = goal.category || 'General';
  goalDailyInput.value = goal.dailyTarget || 60;
  goalWeeklyInput.value = goal.weeklyTarget || 300;
  if (goalStartDateInput) goalStartDateInput.value = goal.startDate || '';
  if (goalEndDateInput) goalEndDateInput.value = goal.endDate || '';
  if (goalDescInput) goalDescInput.value = goal.description || '';

  // Type selection
  const isHabit = goal.type !== 'goal';
  const typeHabit = document.getElementById('type-opt-habit');
  const typeGoal = document.getElementById('type-opt-goal');

  if (isHabit) {
    if (typeHabit) typeHabit.click();
  } else {
    if (typeGoal) typeGoal.click();
  }

  // Recurrence & Days
  if (goalRecurrenceSelect) goalRecurrenceSelect.value = goal.recurrenceType || 'daily';
  setDayPills(Array.isArray(goal.selectedDays) && goal.selectedDays.length > 0 ? goal.selectedDays : [0, 1, 2, 3, 4, 5, 6]);

  setupColorSwatches();

  const priority = goal.priority || 'medium';
  document.querySelectorAll('.priority-option').forEach(o => o.classList.remove('selected'));
  document.querySelector(`.priority-option[data-priority="${priority}"]`)?.classList.add('selected');
  const radio = document.querySelector(`input[value="${priority}"]`);
  if (radio) radio.checked = true;

  updateTargetCalculations();
  openModal(modal);
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function handleToggleArchive(id) {
  const goal = GoalStore.get(id);
  if (!goal) return;

  if (goal.isActive !== false) {
    GoalStore.archive(id);
    showToast(`Archived "${goal.name}"`, 'info');
  } else {
    GoalStore.unarchive(id);
    showToast(`Restored "${goal.name}"`, 'success');
  }
  renderGoals();
}

async function handleDeleteGoal(id) {
  const goal = GoalStore.get(id);
  if (!goal) return;

  const ok = await confirm(
    `Are you sure you want to permanently delete "${goal.name}"? Past session records will be kept.`,
    'Delete Goal',
    '🗑️'
  );

  if (ok) {
    GoalStore.delete(id);
    showToast(`Deleted "${goal.name}"`, 'success');
    renderGoals();
  }
}

// ─── Form Submission ──────────────────────────────────────────────────────────
function setupForm() {
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = goalNameInput.value.trim();
    if (!name) {
      showToast('Please enter a goal name', 'error');
      return;
    }

    const priorityInput = document.querySelector('input[name="goal-priority"]:checked');
    const type = getSelectedType();
    const recurrenceType = goalRecurrenceSelect ? goalRecurrenceSelect.value : 'daily';

    const goalData = {
      id: goalIdInput.value || undefined,
      name,
      icon: goalIconInput.value.trim() || '🎯',
      color: goalColorInput.value || '#FFB800',
      category: goalCatInput.value.trim() || 'General',
      type: type,
      recurrenceType: recurrenceType,
      selectedDays: (type === 'goal' || recurrenceType === 'none') ? [] : currentSelectedDays,
      dailyTarget: parseInt(goalDailyInput.value) || 60,
      weeklyTarget: parseInt(goalWeeklyInput.value) || 300,
      startDate: goalStartDateInput?.value || '',
      endDate: goalEndDateInput?.value || '',
      priority: priorityInput ? priorityInput.value : 'medium',
      description: goalDescInput ? goalDescInput.value.trim() : ''
    };

    GoalStore.save(goalData);
    closeModal(modal);
    showToast(goalData.id ? 'Goal updated ✓' : 'Goal created ✓', 'success');
    renderGoals();
  });

  document.getElementById('goal-modal-close')?.addEventListener('click', () => closeModal(modal));
  document.getElementById('goal-cancel-btn')?.addEventListener('click', () => closeModal(modal));
}

// ─── Tab Switching ────────────────────────────────────────────────────────────
function setupTabs() {
  const tabs = document.querySelectorAll('.pf-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      renderGoals();
    });
  });
}

// ─── Init Page ────────────────────────────────────────────────────────────────
function initGoalsPage() {
  initSidebar({
    pageId: 'goals',
    pageTitle: 'Goals & Habits',
    pageSubtitle: 'Define flexible goals, recurring routines, and custom 7-day targets',
    actionsHTML: `
      <button class="btn-primary" id="open-add-goal-topbar">
        <i class="fas fa-plus"></i> Add Goal
      </button>
    `
  });

  document.getElementById('open-add-goal-topbar')?.addEventListener('click', openCreateModal);

  setupColorSwatches();
  setupPriorityOptions();
  setupTypeOptions();
  setupDaySelector();
  setupHintUpdaters();
  setupForm();
  setupTabs();
  renderGoals();
}

// ─── Reactive Listeners ───────────────────────────────────────────────────────
window.addEventListener('flow:session-completed', () => renderGoals());
window.addEventListener('flow:storage-updated', () => renderGoals());
window.addEventListener('storage', (e) => {
  if (e.key === 'flow_history' || e.key === 'flow_goals') renderGoals();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGoalsPage);
} else {
  initGoalsPage();
}

