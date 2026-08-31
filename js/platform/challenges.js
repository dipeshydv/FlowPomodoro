/* ==========================================================================
   FLOWPOMODORO — Challenges Page JS
   Manages multi-day challenges, tracks daily target consistency,
   and computes challenge streak progress rings.
   ========================================================================== */

import { initSidebar } from '/js/platform/sidebar.js';
import { ChallengeStore, GoalStore, SessionStore } from '/js/platform/store.js';
import { showToast, openModal, closeModal, confirm, formatMinutes, today, renderProgressRing } from '/js/platform/ui-helpers.js';

// ─── DOM References ──────────────────────────────────────────────────────────
const activeGrid = document.getElementById('active-challenges-grid');
const completedSection = document.getElementById('completed-section');
const completedGrid = document.getElementById('completed-challenges-grid');
const modal = document.getElementById('challenge-modal');
const form = document.getElementById('challenge-form');
const nameInput = document.getElementById('c-name');
const goalSelect = document.getElementById('c-goal');
const targetInput = document.getElementById('c-target');
const durationInput = document.getElementById('c-duration');
const startInput = document.getElementById('c-start');

// ─── Populate Goals in Modal ──────────────────────────────────────────────────
function populateGoalOptions() {
  if (!goalSelect) return;
  const goals = GoalStore.getActive();
  goalSelect.innerHTML = `
    <option value="">— Any Activity —</option>
    ${goals.map(g => `
      <option value="${g.id}">${g.icon || '🎯'} ${g.name}</option>
    `).join('')}
  `;
}

// ─── Render Challenges ────────────────────────────────────────────────────────
function renderChallenges() {
  const allChallenges = ChallengeStore.getAll();
  const todayStr = today();

  const active = [];
  const completed = [];

  allChallenges.forEach(c => {
    const elapsed = ChallengeStore.daysElapsed(c);
    if (elapsed >= c.durationDays) {
      completed.push(c);
    } else {
      active.push(c);
    }
  });

  // Render Active
  if (!active.length) {
    activeGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-state-icon">🏆</div>
        <div class="empty-state-title">No active challenges</div>
        <div class="empty-state-desc">Challenge yourself to 30, 60, or 90 days of consistent deliberate practice.</div>
        <button class="btn-primary" id="empty-add-c-btn" style="margin-top:8px;">
          <i class="fas fa-plus"></i> Create Challenge
        </button>
      </div>
    `;

    document.getElementById('empty-add-c-btn')?.addEventListener('click', openCreateModal);
  } else {
    activeGrid.innerHTML = active.map(c => buildChallengeCard(c)).join('');
  }

  // Render Completed
  if (completed.length) {
    completedSection.style.display = 'block';
    completedGrid.innerHTML = completed.map(c => buildChallengeCard(c, true)).join('');
  } else {
    completedSection.style.display = 'none';
  }

  // Draw progress rings and attach delete handlers
  allChallenges.forEach(c => {
    const ringContainer = document.getElementById(`c-ring-${c.id}`);
    if (ringContainer) {
      const progress = ChallengeStore.getProgress(c);
      const daysDone = progress.filter(Boolean).length;
      const pct = Math.min(100, Math.round((daysDone / c.durationDays) * 100));
      renderProgressRing(ringContainer, pct, '#FFB800', `${pct}%`, 56);
    }
  });

  document.querySelectorAll('.delete-c-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
}

// ─── Build Card HTML ──────────────────────────────────────────────────────────
function buildChallengeCard(c, isCompleted = false) {
  let goal = null;
  if (c.goalId) goal = GoalStore.get(c.goalId);

  const progress = ChallengeStore.getProgress(c);
  const daysDone = progress.filter(Boolean).length;
  const elapsed = ChallengeStore.daysElapsed(c);
  const daysLeft = Math.max(0, c.durationDays - elapsed);
  const color = goal?.color || '#FFB800';

  // Last 14 days dots
  const recentDots = progress.slice(-14).map((done, i) => {
    const isToday = i === progress.length - 1;
    return `
      <div class="challenge-day-dot ${done ? 'done' : ''} ${isToday ? 'today' : ''}" 
           title="Day ${i + 1}: ${done ? 'Completed' : 'Missed'}"></div>
    `;
  }).join('');

  return `
    <div class="challenge-card" data-id="${c.id}">
      <div class="challenge-card-top">
        <div>
          <div class="challenge-card-name">${c.name}</div>
          <div class="challenge-card-goal" style="color:${color};">
            ${goal ? `${goal.icon} ${goal.name}` : '🎯 Any Focus Activity'}
          </div>
        </div>
        <div id="c-ring-${c.id}"></div>
      </div>

      <div class="challenge-stats">
        <div class="challenge-stat">
          <span class="challenge-stat-value">${daysDone} / ${c.durationDays}</span>
          <span class="challenge-stat-label">Days Done</span>
        </div>
        <div class="challenge-stat">
          <span class="challenge-stat-value">${daysLeft}</span>
          <span class="challenge-stat-label">${isCompleted ? 'Finished' : 'Days Left'}</span>
        </div>
        <div class="challenge-stat">
          <span class="challenge-stat-value">${formatMinutes(c.dailyTarget)}</span>
          <span class="challenge-stat-label">Daily Target</span>
        </div>
      </div>

      <div>
        <div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;">Recent Consistency</div>
        <div class="challenge-streak-dots">
          ${recentDots || '<span style="font-size:11px;color:var(--text-muted);">Starts today</span>'}
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:auto;padding-top:8px;border-top:1px solid var(--border-color);">
        <button class="table-action-btn danger delete-c-btn" data-id="${c.id}" title="Delete challenge">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

// ─── Modal Openers ────────────────────────────────────────────────────────────
function openCreateModal() {
  form.reset();
  startInput.value = today();
  targetInput.value = 60;
  durationInput.value = 30;
  populateGoalOptions();
  openModal(modal);
}

async function handleDelete(id) {
  const c = ChallengeStore.get(id);
  if (!c) return;

  const ok = await confirm(`Are you sure you want to remove the "${c.name}" challenge?`, 'Delete Challenge', '🗑️');
  if (ok) {
    ChallengeStore.delete(id);
    showToast('Challenge removed', 'info');
    renderChallenges();
  }
}

// ─── Form Submission ──────────────────────────────────────────────────────────
function setupForm() {
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    if (!name) {
      showToast('Please enter a challenge name', 'error');
      return;
    }

    const data = {
      name,
      goalId: goalSelect.value || null,
      dailyTarget: parseInt(targetInput.value) || 60,
      durationDays: parseInt(durationInput.value) || 30,
      startDate: startInput.value || today()
    };

    ChallengeStore.save(data);
    closeModal(modal);
    showToast('Challenge started! Good luck 🔥', 'success');
    renderChallenges();
  });

  document.getElementById('c-modal-close')?.addEventListener('click', () => closeModal(modal));
  document.getElementById('c-cancel-btn')?.addEventListener('click', () => closeModal(modal));
}

// ─── Init Page ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar({
    pageId: 'challenges',
    pageTitle: 'Challenges',
    pageSubtitle: 'Build long-term consistency',
    actionsHTML: `
      <button class="btn-primary" id="open-add-challenge-topbar">
        <i class="fas fa-plus"></i> Add Challenge
      </button>
    `
  });

  document.getElementById('open-add-challenge-topbar')?.addEventListener('click', openCreateModal);

  setupForm();
  renderChallenges();
});
