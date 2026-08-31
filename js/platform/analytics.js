/* ==========================================================================
   FLOWPOMODORO — Analytics Page JS
   ========================================================================== */
import { initSidebar } from '/js/platform/sidebar.js';
import { SessionStore, GoalStore, getLocalDateKey } from '/js/platform/store.js';
import { showToast, formatMinutes, today, thisWeekStart } from '/js/platform/ui-helpers.js';
import { renderSparkline, renderWeekBars, renderHeatmap } from '/js/platform/charts.js';

// ─── Date Range State ────────────────────────────────────────────────────────
let currentRange = 'week';

function getDateRange(range) {
  const t = today();
  if (range === 'week') {
    return { start: thisWeekStart(), end: t };
  }
  if (range === 'month') {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: getLocalDateKey(firstDay), end: t };
  }
  // all time
  const all = SessionStore.getAll();
  if (!all.length) return { start: t, end: t };
  const dates = all.map(s => s.date).sort();
  return { start: dates[0], end: t };
}

// ─── Number of unique active days ────────────────────────────────────────────
function countActiveDays(sessions) {
  return new Set(sessions.map(s => s.date)).size;
}

// ─── Compute analytics for a range ───────────────────────────────────────────
function computeStats(range) {
  const { start, end } = getDateRange(range);
  const sessions = SessionStore.getByDateRange(start, end);

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const totalPomodoros = sessions.length;
  const activeDays = countActiveDays(sessions);
  const dailyAvg = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

  // Best day in range
  const byDay = {};
  sessions.forEach(s => {
    byDay[s.date] = (byDay[s.date] || 0) + (s.durationMinutes || 0);
  });
  let bestDate = null;
  let bestMins = 0;
  Object.entries(byDay).forEach(([d, m]) => {
    if (m > bestMins) { bestMins = m; bestDate = d; }
  });

  return { totalMinutes, totalPomodoros, dailyAvg, bestDate, bestMins, byDay, start, end, sessions };
}

// ─── Build sparkline data for last 7 days ────────────────────────────────────
function last7DayMinutes() {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateKey(d);
    const mins = SessionStore.minutesOnDate(dateStr);
    result.push(mins);
  }
  return result;
}

// ─── Build 7-day data for bar chart (Mon–Sun of current week) ────────────────
function getWeekBarsData() {
  const mon = thisWeekStart();
  const monDate = new Date(mon + 'T00:00:00');
  const data = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monDate);
    d.setDate(monDate.getDate() + i);
    const dateStr = getLocalDateKey(d);
    const minutes = SessionStore.minutesOnDate(dateStr);
    data.push({ date: dateStr, minutes });
  }
  return data;
}

// ─── Build heatmap data (last 60 days) ────────────────────────────────────────
function getHeatmapData() {
  const result = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateKey(d);
    const minutes = SessionStore.minutesOnDate(dateStr);
    result.push({ date: dateStr, value: minutes });
  }
  return result;
}

// ─── Format date ──────────────────────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Render page ──────────────────────────────────────────────────────────────
function render() {
  const { totalMinutes, totalPomodoros, dailyAvg, bestDate, bestMins, byDay, start, end } = computeStats(currentRange);

  // Stats
  const focusEl = document.getElementById('stat-focus-time');
  const pomsEl = document.getElementById('stat-pomodoros');
  const avgEl = document.getElementById('stat-daily-avg');
  const bestEl = document.getElementById('stat-best-day');
  const bestLabel = document.getElementById('stat-best-label');

  if (focusEl) focusEl.textContent = formatMinutes(totalMinutes);
  if (pomsEl) pomsEl.textContent = totalPomodoros;
  if (avgEl) avgEl.textContent = formatMinutes(dailyAvg);
  if (bestEl) bestEl.textContent = formatMinutes(bestMins);
  if (bestLabel) {
    bestLabel.textContent = bestDate ? fmtDate(bestDate) : '';
  }

  // Sparklines (last 7 days always)
  const spark7 = last7DayMinutes();
  const sparkFocusEl = document.getElementById('spark-focus');
  const sparkPomsEl = document.getElementById('spark-pomodoros');
  const sparkAvgEl = document.getElementById('spark-avg');
  const sparkBestEl = document.getElementById('spark-best');

  if (sparkFocusEl) renderSparkline(sparkFocusEl, spark7, '#FFB800');
  if (sparkPomsEl) {
    renderSparkline(sparkPomsEl, spark7.map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return SessionStore.getByDate(getLocalDateKey(d)).length;
    }), '#4ECDC4');
  }
  if (sparkAvgEl) renderSparkline(sparkAvgEl, spark7, '#45B7D1');
  if (sparkBestEl) renderSparkline(sparkBestEl, spark7, '#FFB800');

  // Week range label
  const weekLabel = document.getElementById('week-range-label');
  if (weekLabel) {
    weekLabel.textContent = `${fmtDate(start)} – ${fmtDate(end)}`;
  }

  // Week bars
  const weekBarsContainer = document.getElementById('week-bars-container');
  if (weekBarsContainer) {
    renderWeekBars(weekBarsContainer, getWeekBarsData(), '#FFB800');
  }

  // Goal breakdown
  renderGoalBreakdown(start, end, byDay);

  // Heatmap
  const heatmapContainer = document.getElementById('heatmap-container');
  if (heatmapContainer) {
    renderHeatmap(heatmapContainer, getHeatmapData(), '#FFB800');
  }
}

// ─── Goal Breakdown Table ────────────────────────────────────────────────────
function renderGoalBreakdown(start, end, byDayAll) {
  const goals = GoalStore.getActive();
  const tbody = document.getElementById('goal-breakdown-body');
  if (!tbody) return;

  if (!goals.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">No active goals</td></tr>`;
    return;
  }

  // Count total active days in range
  const rangeStart = new Date(start + 'T00:00:00');
  const rangeEnd = new Date(end + 'T00:00:00');
  const rangeDays = Math.max(1, Math.round((rangeEnd - rangeStart) / 86400000) + 1);

  const rows = goals.map(goal => {
    const goalSessions = SessionStore.getByDateRange(start, end).filter(s => s.goalId && String(s.goalId).trim() === String(goal.id).trim());
    const sessions = goalSessions.length;
    const focusTime = goalSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const activeDays = countActiveDays(goalSessions);
    const dAvg = activeDays > 0 ? Math.round(focusTime / activeDays) : 0;

    // Progress: % of target achieved in period
    const weeklyTarget = goal.weeklyTarget || (goal.dailyTarget * (goal.selectedDays?.length || 7)) || 300;
    const periodTarget = (weeklyTarget / 7) * rangeDays;
    const pct = periodTarget > 0 ? Math.min(100, Math.round((focusTime / periodTarget) * 100)) : 0;

    const color = goal.color || '#FFB800';
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.2rem;">${goal.icon || '🎯'}</span>
            <div>
              <div style="font-weight:600;">${goal.name}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${goal.category || 'General'}</div>
            </div>
          </div>
        </td>
        <td>${sessions}</td>
        <td>${formatMinutes(focusTime)}</td>
        <td>${formatMinutes(dAvg)}</td>
        <td style="min-width:120px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="progress-track" style="flex:1;">
              <div class="progress-fill" style="width:${pct}%;background:${color};"></div>
            </div>
            <span style="font-size:0.8rem;color:var(--text-secondary);white-space:nowrap;">${pct}%</span>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rows.join('');
}

// ─── Tab wiring ───────────────────────────────────────────────────────────────
document.getElementById('range-tabs')?.querySelectorAll('.pf-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#range-tabs .pf-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    currentRange = btn.dataset.range;
    render();
  });
});

// ─── Reactive Listeners ───────────────────────────────────────────────────────
window.addEventListener('flow:session-completed', () => render());
window.addEventListener('flow:storage-updated', () => render());
window.addEventListener('storage', (e) => {
  if (e.key === 'flow_history' || e.key === 'flow_goals') render();
});

// ─── Init ──────────────────────────────────────────────────────────────────────
initSidebar({
  pageId: 'analytics',
  pageTitle: 'Analytics',
  pageSubtitle: 'Track your progress',
});

render();
