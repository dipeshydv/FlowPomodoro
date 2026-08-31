/* ==========================================================================
   FLOWPOMODORO — Today Page JS
   Manages Today's Scheduled Goals, Rest Day Habits, and Time Blocks.
   ========================================================================== */

import { initSidebar } from '/js/platform/sidebar.js';
import { GoalStore, BlockStore, SessionStore, today } from '/js/platform/store.js';
import { showToast, openModal, closeModal, confirm, formatMinutes, formatDateLong, formatTimeRange } from '/js/platform/ui-helpers.js';

// ─── DOM References ──────────────────────────────────────────────────────────
const goalsList = document.getElementById('today-goals-list');
const blocksList = document.getElementById('today-blocks-list');
const dateLabel = document.getElementById('today-date-label');
const modal = document.getElementById('block-modal');
const form = document.getElementById('block-form');
const modalTitle = document.getElementById('block-modal-title');
const blockIdInput = document.getElementById('block-id');
const blockTitleInput = document.getElementById('block-title');
const blockGoalInput = document.getElementById('block-goal');
const blockDateInput = document.getElementById('block-date');
const blockStartInput = document.getElementById('block-start');
const blockEndInput = document.getElementById('block-end');
const blockTypeInput = document.getElementById('block-type');
const blockNotesInput = document.getElementById('block-notes');

// ─── Render Goals ─────────────────────────────────────────────────────────────
function renderGoals() {
  if (!goalsList) return;

  const todayStr = today();
  const activeGoals = GoalStore.getActive();

  if (!activeGoals.length) {
    goalsList.innerHTML = `
      <div class="empty-state" style="padding:40px 16px;">
        <div class="empty-state-icon">🎯</div>
        <div class="empty-state-title">No active goals</div>
        <div class="empty-state-desc">Define goals and recurring habits to structure your daily focus.</div>
        <a href="/app/goals.html" class="btn-primary btn-sm" style="margin-top:8px;text-decoration:none;">
          <i class="fas fa-plus"></i> Create Goal
        </a>
      </div>
    `;
    return;
  }

  // Filter scheduled vs rest vs outcome goals
  const scheduledGoals = activeGoals.filter(g => GoalStore.isScheduledForDate(g, todayStr));
  const restHabits = activeGoals.filter(g => GoalStore.isRestDay(g, todayStr));
  const skippedHabits = activeGoals.filter(g => GoalStore.isSkippedForDate(g.id, todayStr));
  const outcomeGoals = activeGoals.filter(g => g.type === 'goal' || g.recurrenceType === 'none');

  let scheduledCardsHTML = '';
  if (scheduledGoals.length === 0 && outcomeGoals.length === 0 && skippedHabits.length === 0) {
    scheduledCardsHTML = `
      <div style="background:var(--bg-surface);border:1px dashed var(--border-color);border-radius:var(--radius-lg);padding:24px;text-align:center;">
        <div style="font-size:28px;margin-bottom:6px;">🌴</div>
        <div style="font-weight:700;font-size:14px;color:var(--text-primary);">All habits are resting today!</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">No mandatory focus habits scheduled for today. Enjoy your rest or start a flexible session.</div>
      </div>
    `;
  } else {
    scheduledCardsHTML = scheduledGoals.map(g => {
      const minsDone = SessionStore.todayMinutesForGoal(g.id);
      const target = g.dailyTarget || 60;
      const pct = Math.min(100, Math.round((minsDone / target) * 100));
      const color = g.color || '#FFB800';

      let statusText = 'Behind';
      let statusClass = 'behind';
      if (pct >= 100) {
        statusText = 'Done ✓';
        statusClass = 'done';
      } else if (pct >= 50) {
        statusText = 'On Track';
        statusClass = 'on-track';
      }

      return `
        <div class="today-goal-card" style="border-left-color:${color};">
          <div class="today-goal-top">
            <div class="today-goal-left">
              <div class="goal-icon-badge" style="background:${color}20;color:${color};">
                ${g.icon || '🎯'}
              </div>
              <div>
                <div style="font-weight:700;font-size:var(--text-sm);">${g.name}</div>
                <div style="font-size:11px;color:var(--text-muted);">${g.category || 'General'}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="today-goal-status ${statusClass}">${statusText}</span>
              <a href="/app/pomodoro.html?goalId=${g.id}" class="btn-primary btn-sm" style="text-decoration:none;font-size:11px;padding:4px 8px;display:inline-flex;align-items:center;gap:4px;"><i class="fas fa-play"></i> Focus</a>
              <button class="btn-skip-today" data-id="${g.id}" title="Skip today's session only">
                <i class="fas fa-forward"></i> Skip
              </button>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;color:var(--text-secondary);">
              <span>Today's Target</span>
              <span><strong>${formatMinutes(minsDone)}</strong> / ${formatMinutes(target)} (${pct}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%;background:${color};"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Skipped occurrences section
  let skippedHTML = '';
  if (skippedHabits.length > 0) {
    skippedHTML = `
      <div style="margin-top:16px;">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">
          Skipped for Today:
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${skippedHabits.map(g => `
            <div class="today-rest-card" style="border-left-color:#FF6B6B;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:16px;">${g.icon || '🎯'}</span>
                <div>
                  <div style="font-weight:600;font-size:13px;text-decoration:line-through;color:var(--text-muted);">${g.name}</div>
                  <div style="font-size:11px;color:#FF6B6B;">Skipped for today</div>
                </div>
              </div>
              <button class="btn-secondary btn-sm btn-undo-skip" data-id="${g.id}">
                <i class="fas fa-arrow-rotate-left"></i> Undo Skip
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Rest Day Habits section
  let restDaysHTML = '';
  if (restHabits.length > 0) {
    restDaysHTML = `
      <div style="margin-top:20px;">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">
          Rest Day Habits (Not Scheduled Today):
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${restHabits.map(g => {
            const minsDone = SessionStore.todayMinutesForGoal(g.id);
            return `
              <div class="today-rest-card">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:16px;">${g.icon || '🎯'}</span>
                  <div>
                    <div style="font-weight:600;font-size:13px;">${g.name}</div>
                    <div style="font-size:11px;color:var(--text-muted);">
                      <i class="fas fa-bed"></i> Rest Day ${minsDone > 0 ? `• ${formatMinutes(minsDone)} logged` : ''}
                    </div>
                  </div>
                </div>
                <a href="/app/pomodoro.html?goalId=${g.id}" class="btn-secondary btn-sm" style="text-decoration:none;">
                  <i class="fas fa-play"></i> Focus Anyway
                </a>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Flexible / Outcome Goals section (if any)
  let outcomeHTML = '';
  if (outcomeGoals.length > 0) {
    outcomeHTML = `
      <div style="margin-top:20px;">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">
          Flexible / Outcome Goals:
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${outcomeGoals.map(g => {
            const minsDone = SessionStore.todayMinutesForGoal(g.id);
            const color = g.color || '#FFB800';
            return `
              <div class="today-rest-card" style="border-left-color:${color};">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:16px;">${g.icon || '🎯'}</span>
                  <div>
                    <div style="font-weight:600;font-size:13px;">${g.name}</div>
                    <div style="font-size:11px;color:var(--text-muted);">
                      Outcome Goal • ${minsDone > 0 ? `${formatMinutes(minsDone)} logged today` : 'Flexible cadence'}
                    </div>
                  </div>
                </div>
                <a href="/app/pomodoro.html?goalId=${g.id}" class="btn-secondary btn-sm" style="text-decoration:none;">
                  <i class="fas fa-play"></i> Focus
                </a>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  goalsList.innerHTML = scheduledCardsHTML + skippedHTML + restDaysHTML + outcomeHTML;

  // Bind Skip & Undo Skip buttons
  goalsList.querySelectorAll('.btn-skip-today').forEach(btn => {
    btn.addEventListener('click', () => {
      const goalId = btn.dataset.id;
      GoalStore.toggleSkipForDate(goalId, todayStr);
      showToast('Skipped for today', 'info');
      renderGoals();
    });
  });

  goalsList.querySelectorAll('.btn-undo-skip').forEach(btn => {
    btn.addEventListener('click', () => {
      const goalId = btn.dataset.id;
      GoalStore.toggleSkipForDate(goalId, todayStr);
      showToast('Restored for today', 'success');
      renderGoals();
    });
  });
}

// ─── Render Blocks ────────────────────────────────────────────────────────────
function renderBlocks() {
  if (!blocksList) return;

  const todayStr = today();
  const blocks = BlockStore.getByDate(todayStr);

  if (!blocks.length) {
    blocksList.innerHTML = `
      <div class="empty-state" style="padding:40px 16px;">
        <div class="empty-state-icon">⏰</div>
        <div class="empty-state-title">No time blocks today</div>
        <div class="empty-state-desc">Schedule your arbitrary time blocks and planned breaks for today.</div>
        <button class="btn-primary btn-sm" id="empty-add-block-btn" style="margin-top:8px;">
          <i class="fas fa-plus"></i> Add Time Block
        </button>
      </div>
    `;

    document.getElementById('empty-add-block-btn')?.addEventListener('click', openCreateBlockModal);
    return;
  }

  const html = blocks.map(b => {
    let goal = null;
    if (b.goalId) goal = GoalStore.get(b.goalId);

    const isBreak = b.type === 'break' || (!b.goalId && b.title.toLowerCase().includes('break'));
    const color = b.color || goal?.color || (isBreak ? '#22d3a0' : '#FFB800');

    return `
      <div class="today-block-card ${isBreak ? 'type-break' : ''}" style="border-left-color:${color};">
        <div class="today-block-info">
          <div class="today-block-time">
            <i class="fas fa-clock" style="margin-right:4px;"></i> ${formatTimeRange(b.startTime, b.endTime)}
          </div>
          <div class="today-block-title">${b.title}</div>
          ${goal ? `<div class="today-block-goal">${goal.icon || '🎯'} ${goal.name}</div>` : ''}
          ${b.notes ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${b.notes}</div>` : ''}
        </div>
        <div class="table-actions">
          ${!isBreak ? `
            <a href="/app/pomodoro.html${b.goalId ? `?goalId=${b.goalId}` : ''}" class="btn-primary btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;font-size:11px;" title="Focus on this block">
              <i class="fas fa-play"></i> Focus
            </a>
          ` : ''}
          <button class="table-action-btn edit-block-btn" data-id="${b.id}" title="Edit block">
            <i class="fas fa-pencil"></i>
          </button>
          <button class="table-action-btn danger delete-block-btn" data-id="${b.id}" title="Delete block">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  blocksList.innerHTML = html;

  blocksList.querySelectorAll('.edit-block-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditBlockModal(btn.dataset.id));
  });

  blocksList.querySelectorAll('.delete-block-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteBlock(btn.dataset.id));
  });
}

// ─── Goal Dropdown Setup ──────────────────────────────────────────────────────
function populateGoalDropdown(selectedGoalId = '') {
  if (!blockGoalInput) return;
  const activeGoals = GoalStore.getActive();
  
  blockGoalInput.innerHTML = `
    <option value="">— No goal (Break / Flexible) —</option>
    ${activeGoals.map(g => `
      <option value="${g.id}" ${g.id === selectedGoalId ? 'selected' : ''}>
        ${g.icon || '🎯'} ${g.name} (${g.category || 'General'})
      </option>
    `).join('')}
  `;
}

// ─── Modal Openers ────────────────────────────────────────────────────────────
function openCreateBlockModal() {
  modalTitle.textContent = 'Add Time Block';
  form.reset();
  blockIdInput.value = '';
  blockDateInput.value = today();
  blockStartInput.value = '08:15';
  blockEndInput.value = '09:45';
  populateGoalDropdown('');
  openModal(modal);
}

function openEditBlockModal(id) {
  const all = BlockStore.getAll();
  const block = all.find(b => b.id === id);
  if (!block) return;

  modalTitle.textContent = 'Edit Time Block';
  blockIdInput.value = block.id;
  blockTitleInput.value = block.title || '';
  blockDateInput.value = block.date || today();
  blockStartInput.value = block.startTime || '08:15';
  blockEndInput.value = block.endTime || '09:45';
  blockNotesInput.value = block.notes || '';
  populateGoalDropdown(block.goalId || '');

  openModal(modal);
}

async function handleDeleteBlock(id) {
  const ok = await confirm('Delete this time block?', 'Delete Block', '🗑️');
  if (ok) {
    BlockStore.delete(id);
    showToast('Block removed', 'info');
    renderBlocks();
  }
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

    const blockData = {
      id: blockIdInput.value || undefined,
      title,
      goalId: blockGoalInput.value || null,
      date: blockDateInput.value || today(),
      startTime: blockStartInput.value || '08:15',
      endTime: blockEndInput.value || '09:45',
      notes: blockNotesInput.value.trim()
    };

    BlockStore.save(blockData);
    closeModal(modal);
    showToast(blockData.id ? 'Block updated ✓' : 'Block scheduled ✓', 'success');
    renderBlocks();
  });

  document.getElementById('block-modal-close')?.addEventListener('click', () => closeModal(modal));
  document.getElementById('block-cancel-btn')?.addEventListener('click', () => closeModal(modal));
}

// ─── Init Page ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const todayStr = today();
  const displayDate = formatDateLong(todayStr);

  initSidebar({
    pageId: 'today',
    pageTitle: 'Today',
    pageSubtitle: displayDate,
    actionsHTML: `
      <button class="btn-primary" id="open-add-block-topbar">
        <i class="fas fa-plus"></i> Add Block
      </button>
    `
  });

  if (dateLabel) {
    dateLabel.textContent = `Schedule for ${displayDate}`;
  }

  document.getElementById('open-add-block-topbar')?.addEventListener('click', openCreateBlockModal);
  document.getElementById('btn-add-block-inline')?.addEventListener('click', openCreateBlockModal);

  setupForm();
  renderGoals();
  renderBlocks();
});

// ─── Reactive Listeners ───────────────────────────────────────────────────────
window.addEventListener('flow:session-completed', () => { renderGoals(); renderBlocks(); });
window.addEventListener('flow:storage-updated', () => { renderGoals(); renderBlocks(); });
window.addEventListener('storage', (e) => {
  if (e.key === 'flow_history' || e.key === 'flow_goals' || e.key === 'flow_timeblocks') {
    renderGoals();
    renderBlocks();
  }
});
