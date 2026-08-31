/* ==========================================================================
   FLOWPOMODORO — Dashboard Page JS
   Renders daily stats, goals progress, today's plan, and streak card.
   ========================================================================== */

import { initSidebar } from '/js/platform/sidebar.js';
import { GoalStore, BlockStore, SessionStore, SettingsStore } from '/js/platform/store.js';
import { formatMinutes, today, dayLetter, renderProgressBar, renderStatRing } from '/js/platform/ui-helpers.js';

// ─── Motivational Quotes ──────────────────────────────────────────────────────
const QUOTES = [
  { text: "Discipline is choosing what you want most over what you want now.", author: "Unknown" },
  { text: "Focus is the new IQ.", author: "Cal Newport" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
  { text: "Deep work is the superpower of the 21st century.", author: "Cal Newport" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" }
];

function getDailyQuote() {
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  return QUOTES[dayOfYear % QUOTES.length];
}

// ─── Render Stat Cards ────────────────────────────────────────────────────────
function renderStatCards() {
  const grid = document.getElementById('stat-cards-grid');
  if (!grid) return;

  const todayMins = SessionStore.todayMinutes();
  const todayPoms = SessionStore.todayCount();
  const settings = SettingsStore.get();
  const targetPoms = settings.goal || 4;
  const targetMins = targetPoms * (settings.focus || 25);

  const activeGoals = GoalStore.getActive();
  let completedGoalsCount = 0;
  let totalGoalProgressPct = 0;

  activeGoals.forEach(g => {
    const minsDone = SessionStore.todayMinutesForGoal(g.id);
    const target = g.dailyTarget || 60;
    const pct = Math.min(100, Math.round((minsDone / target) * 100));
    if (pct >= 100) completedGoalsCount++;
    totalGoalProgressPct += pct;
  });

  const focusPct = targetMins > 0 ? Math.min(100, Math.round((todayMins / targetMins) * 100)) : 0;
  const pomsPct = targetPoms > 0 ? Math.min(100, Math.round((todayPoms / targetPoms) * 100)) : 0;
  const goalsPct = activeGoals.length > 0 ? Math.min(100, Math.round((completedGoalsCount / activeGoals.length) * 100)) : 0;

  // Daily Score: weighted (pomodoros vs target 40%, goals progress 60%)
  const avgGoalPct = activeGoals.length > 0 ? (totalGoalProgressPct / activeGoals.length) : 0;
  const pomWeight = Math.min(1, todayPoms / Math.max(1, targetPoms)) * 40;
  const goalWeight = (avgGoalPct / 100) * 60;
  const dailyScore = Math.min(100, Math.round(pomWeight + goalWeight));

  grid.innerHTML = `
    <!-- Card 1: Focus Time -->
    <div class="stat-card">
      <div class="stat-card-top">
        <span class="stat-card-label">Focus Time</span>
        <div class="stat-card-ring" id="ring-focus"></div>
      </div>
      <div class="stat-card-value">${formatMinutes(todayMins)}</div>
      <div class="stat-card-sub">/ ${formatMinutes(targetMins)} target</div>
    </div>

    <!-- Card 2: Pomodoros -->
    <div class="stat-card">
      <div class="stat-card-top">
        <span class="stat-card-label">Pomodoros</span>
        <div class="stat-card-ring" id="ring-poms"></div>
      </div>
      <div class="stat-card-value">${todayPoms}</div>
      <div class="stat-card-sub">/ ${targetPoms} sessions</div>
    </div>

    <!-- Card 3: Goals Completed -->
    <div class="stat-card">
      <div class="stat-card-top">
        <span class="stat-card-label">Goals Completed</span>
        <div class="stat-card-ring" id="ring-goals"></div>
      </div>
      <div class="stat-card-value">${completedGoalsCount}</div>
      <div class="stat-card-sub">/ ${activeGoals.length} active goals</div>
    </div>

    <!-- Card 4: Daily Score -->
    <div class="stat-card">
      <div class="stat-card-top">
        <span class="stat-card-label">Daily Score</span>
        <div class="stat-card-ring" id="ring-score"></div>
      </div>
      <div class="stat-card-value">${(dailyScore / 10).toFixed(1)}</div>
      <div class="stat-card-sub">/ 10 max points</div>
    </div>
  `;

  renderStatRing(document.getElementById('ring-focus'), focusPct, '#FFB800');
  renderStatRing(document.getElementById('ring-poms'), pomsPct, '#22d3a0');
  renderStatRing(document.getElementById('ring-goals'), goalsPct, '#45B7D1');
  renderStatRing(document.getElementById('ring-score'), dailyScore, '#FFB800');
}

// ─── Render Today's Goals Panel ──────────────────────────────────────────────
function renderTodayGoals() {
  const container = document.getElementById('goals-panel-body');
  if (!container) return;

  const todayStr = today();
  const activeGoals = GoalStore.getActive();

  if (!activeGoals.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:32px 16px;">
        <div class="empty-state-icon">🎯</div>
        <div class="empty-state-title">No goals created yet</div>
        <div class="empty-state-desc">Define your first custom goal to begin tracking deliberate progress.</div>
        <a href="/app/goals.html" class="btn-primary btn-sm" style="margin-top:8px;text-decoration:none;">
          <i class="fas fa-plus"></i> Create Goal
        </a>
      </div>
    `;
    return;
  }

  // Sort: scheduled today first, then outcome goals, then resting habits
  const sorted = [...activeGoals].sort((a, b) => {
    const aSched = GoalStore.isScheduledForDate(a, todayStr) ? 2 : (a.type === 'goal' ? 1 : 0);
    const bSched = GoalStore.isScheduledForDate(b, todayStr) ? 2 : (b.type === 'goal' ? 1 : 0);
    return bSched - aSched;
  });

  // Show top goals
  const displayGoals = sorted.slice(0, 4);

  const html = displayGoals.map(g => {
    const minsDone = SessionStore.todayMinutesForGoal(g.id);
    const target = g.dailyTarget || 60;
    const isRest = GoalStore.isRestDay(g, todayStr);
    const isSkipped = GoalStore.isSkippedForDate(g.id, todayStr);
    const pct = isRest ? 100 : Math.min(100, Math.round((minsDone / target) * 100));
    const color = g.color || '#FFB800';

    let subText = `${formatMinutes(minsDone)} / ${formatMinutes(target)}`;
    let pctLabel = `${pct}%`;

    if (isSkipped) {
      subText = `<span style="color:#FF6B6B;">Skipped today</span>`;
      pctLabel = `—`;
    } else if (isRest) {
      subText = minsDone > 0 ? `${formatMinutes(minsDone)} logged (Rest Day)` : `Rest Day (Optional)`;
      pctLabel = `🌴`;
    }

    return `
      <div class="goal-row">
        <div class="goal-icon-badge" style="background:${color}20;color:${color};">
          ${g.icon || '🎯'}
        </div>
        <div class="goal-row-info">
          <div class="goal-row-name">${g.name}</div>
          <div class="goal-row-sub">${subText}</div>
        </div>
        <div class="goal-progress-bar">
          <div class="progress-track">
            <div class="progress-fill" style="width:${isRest && minsDone === 0 ? 0 : pct}%;background:${isRest ? '#64748B' : color};"></div>
          </div>
        </div>
        <div class="goal-pct">${pctLabel}</div>
        <a href="/app/pomodoro.html?goalId=${g.id}" class="btn-primary btn-sm" style="text-decoration:none;margin-left:8px;font-size:11px;padding:3px 8px;display:inline-flex;align-items:center;gap:4px;" title="Focus on ${g.name}">
          <i class="fas fa-play"></i> Focus
        </a>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// ─── Render Today's Plan Panel ────────────────────────────────────────────────
function renderTodayPlan() {
  const container = document.getElementById('plan-panel-body');
  if (!container) return;

  const blocks = BlockStore.getByDate(today());

  if (!blocks.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:32px 16px;">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-title">No time blocks for today</div>
        <div class="empty-state-desc">Plan your day with dedicated focus blocks and scheduled breaks.</div>
        <a href="/app/today.html" class="btn-secondary btn-sm" style="margin-top:8px;text-decoration:none;">
          <i class="fas fa-calendar-plus"></i> Plan Today
        </a>
      </div>
    `;
    return;
  }

  const html = `
    <div class="time-block-list">
      ${blocks.map(b => {
        const isBreak = !b.goalId && b.title.toLowerCase().includes('break');
        const badgeClass = isBreak ? 'break' : 'focus';
        const badgeLabel = isBreak ? 'Break' : 'Focus';

        let goalObj = null;
        if (b.goalId) {
          goalObj = GoalStore.get(b.goalId);
        }

        const borderCol = goalObj?.color || (isBreak ? '#22d3a0' : '#FFB800');

        return `
          <div class="time-block-item ${isBreak ? 'type-break' : ''}" style="border-left-color:${borderCol};">
            <span class="time-block-time">${b.startTime} – ${b.endTime}</span>
            <span class="time-block-title">${b.title}</span>
            ${!isBreak ? `
              <a href="/app/pomodoro.html${b.goalId ? `?goalId=${b.goalId}` : ''}" class="time-block-badge focus" style="text-decoration:none;display:inline-flex;align-items:center;gap:3px;" title="Start focus session">
                <i class="fas fa-play" style="font-size:9px;"></i> Focus
              </a>
            ` : `
              <span class="time-block-badge break">Break</span>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.innerHTML = html;
}

// ─── Render Streak Card ───────────────────────────────────────────────────────
function renderStreakCard() {
  const container = document.getElementById('streak-card-wrap');
  if (!container) return;

  const streakData = SessionStore.streakData();
  const quote = getDailyQuote();

  // Last 7 days dots
  const dayDots = [];
  const todayStr = today();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const letter = dayLetter(dStr);
    const isDone = (streakData.dates || []).includes(dStr);
    const isToday = dStr === todayStr;

    dayDots.push(`
      <div class="streak-dot ${isDone ? 'done' : ''} ${isToday ? 'today' : ''}" title="${dStr}">
        ${letter}
      </div>
    `);
  }

  container.innerHTML = `
    <div class="streak-card">
      <div class="streak-fire">🔥</div>
      <div class="streak-number">${streakData.current}</div>
      <div class="streak-label">Day Focus Streak</div>

      <div class="streak-week">
        ${dayDots.join('')}
      </div>

      <div class="streak-quote">
        "${quote.text}"
        <div style="margin-top:4px;font-weight:600;font-style:normal;color:var(--text-muted);">— ${quote.author}</div>
      </div>
    </div>
  `;
}

// ─── Init Page ────────────────────────────────────────────────────────────────
function renderDashboard() {
  renderStatCards();
  renderTodayGoals();
  renderTodayPlan();
  renderStreakCard();
}

function initDashboardPage() {
  initSidebar({
    pageId: 'dashboard',
    pageTitle: 'Dashboard',
    pageSubtitle: "Your time. Your flow.",
    actionsHTML: `
      <a href="/app/pomodoro.html" class="btn-primary btn-sm" style="text-decoration:none;">
        <i class="fas fa-stopwatch"></i> Start Pomodoro
      </a>
    `
  });

  renderDashboard();
}

// ─── Reactive Listeners ───────────────────────────────────────────────────────
window.addEventListener('flow:session-completed', () => renderDashboard());
window.addEventListener('flow:storage-updated', () => renderDashboard());
window.addEventListener('storage', (e) => {
  if (e.key === 'flow_history' || e.key === 'flow_goals' || e.key === 'flow_timeblocks') {
    renderDashboard();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardPage);
} else {
  initDashboardPage();
}
