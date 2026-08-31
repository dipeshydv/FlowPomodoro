/* ==========================================================================
   FLOWPOMODORO — Settings Page JS
   Manages timer durations, theme toggle, default mode preferences,
   JSON backup export, and file import/reset operations.
   ========================================================================== */

import { initSidebar } from '/js/platform/sidebar.js';
import { SettingsStore, ThemeStore, exportAllData } from '/js/platform/store.js';
import { showToast, confirm, today } from '/js/platform/ui-helpers.js';
import { Storage } from '/js/storage.js';

// ─── DOM References ──────────────────────────────────────────────────────────
const focusInput = document.getElementById('s-focus');
const shortInput = document.getElementById('s-short');
const longInput = document.getElementById('s-long');
const goalInput = document.getElementById('s-goal');
const modeSelect = document.getElementById('s-mode');
const saveTimerBtn = document.getElementById('save-timer-settings-btn');

// Planner Settings References
const plannerStartInput = document.getElementById('s-planner-start');
const plannerEndInput = document.getElementById('s-planner-end');
const plannerIntervalSelect = document.getElementById('s-planner-interval');
const firstDaySelect = document.getElementById('s-first-day');
const warnOverlapCheck = document.getElementById('s-warn-overlap');
const savePlannerBtn = document.getElementById('save-planner-settings-btn');

const themeDarkBtn = document.getElementById('theme-btn-dark');
const themeLightBtn = document.getElementById('theme-btn-light');

const exportBtn = document.getElementById('export-data-btn');
const importFileInput = document.getElementById('import-file-input');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

// ─── Load Settings ────────────────────────────────────────────────────────────
function loadSettings() {
  const s = SettingsStore.get();
  if (focusInput) focusInput.value = s.focus || 25;
  if (shortInput) shortInput.value = s.short || 5;
  if (longInput) longInput.value = s.long || 15;
  if (goalInput) goalInput.value = s.goal || 4;
  if (modeSelect) modeSelect.value = s.defaultMode || 'simple';

  if (plannerStartInput) plannerStartInput.value = s.plannerStart || '06:00';
  if (plannerEndInput) plannerEndInput.value = s.plannerEnd || '23:00';
  if (plannerIntervalSelect) plannerIntervalSelect.value = String(s.plannerInterval || 15);
  if (firstDaySelect) firstDaySelect.value = String(s.firstDayOfWeek ?? 1);
  if (warnOverlapCheck) warnOverlapCheck.checked = s.warnOverlap !== false;

  updateThemeButtons();
}

function updateThemeButtons() {
  const currentTheme = ThemeStore.get();
  if (themeDarkBtn) {
    themeDarkBtn.classList.toggle('active', currentTheme === 'dark');
    themeDarkBtn.style.borderColor = currentTheme === 'dark' ? 'var(--brand-primary)' : '';
  }
  if (themeLightBtn) {
    themeLightBtn.classList.toggle('active', currentTheme === 'light');
    themeLightBtn.style.borderColor = currentTheme === 'light' ? 'var(--brand-primary)' : '';
  }
}

// ─── Presets ──────────────────────────────────────────────────────────────────
function setupPresets() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      if (preset === '25') {
        focusInput.value = 25; shortInput.value = 5; longInput.value = 15;
      } else if (preset === '50') {
        focusInput.value = 50; shortInput.value = 10; longInput.value = 20;
      } else if (preset === '90') {
        focusInput.value = 90; shortInput.value = 20; longInput.value = 30;
      }
      showToast(`Loaded ${preset}m preset`, 'info');
    });
  });
}

// ─── Save Timer Settings ──────────────────────────────────────────────────────
function setupSave() {
  saveTimerBtn?.addEventListener('click', () => {
    const focus = Math.max(1, parseInt(focusInput.value) || 25);
    const short = Math.max(1, parseInt(shortInput.value) || 5);
    const long = Math.max(1, parseInt(longInput.value) || 15);
    const goal = Math.max(1, parseInt(goalInput.value) || 4);
    const defaultMode = modeSelect.value || 'simple';

    SettingsStore.save({ focus, short, long, goal, defaultMode });
    showToast('Timer settings saved ✓', 'success');
  });

  modeSelect?.addEventListener('change', () => {
    SettingsStore.save({ defaultMode: modeSelect.value });
    showToast('Productivity mode updated', 'info');
  });

  savePlannerBtn?.addEventListener('click', () => {
    const plannerStart = plannerStartInput?.value || '06:00';
    const plannerEnd = plannerEndInput?.value || '23:00';
    const plannerInterval = parseInt(plannerIntervalSelect?.value) || 15;
    const firstDayOfWeek = parseInt(firstDaySelect?.value) || 1;
    const warnOverlap = warnOverlapCheck ? warnOverlapCheck.checked : true;

    SettingsStore.save({
      plannerStart,
      plannerEnd,
      plannerInterval,
      firstDayOfWeek,
      warnOverlap
    });

    showToast('Planner preferences saved ✓', 'success');
  });
}

// ─── Theme Handlers ───────────────────────────────────────────────────────────
function setupTheme() {
  themeDarkBtn?.addEventListener('click', () => {
    ThemeStore.set('dark');
    updateThemeButtons();
    showToast('Switched to Dark theme', 'info');
  });

  themeLightBtn?.addEventListener('click', () => {
    ThemeStore.set('light');
    updateThemeButtons();
    showToast('Switched to Light theme', 'info');
  });
}

// ─── Export / Import / Clear ──────────────────────────────────────────────────
function setupDataManagement() {
  // Export JSON
  exportBtn?.addEventListener('click', () => {
    const data = exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowpomodoro-workspace-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Workspace exported ✓', 'success');
  });

  // Import JSON
  importFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON structure');
        }

        const ok = await confirm('Importing will merge/replace current workspace data with this backup. Proceed?', 'Import Data', '📥');
        if (!ok) return;

        if (Array.isArray(parsed.goals)) Storage.set('flow_goals', parsed.goals);
        if (Array.isArray(parsed.timeBlocks)) Storage.set('flow_timeblocks', parsed.timeBlocks);
        if (Array.isArray(parsed.challenges)) Storage.set('flow_challenges', parsed.challenges);
        if (parsed.reviews) Storage.set('flow_daily_reviews', parsed.reviews);
        if (parsed.weeklyReviews) Storage.set('flow_weekly_reviews', parsed.weeklyReviews);
        if (Array.isArray(parsed.sessions)) Storage.set('flow_history', parsed.sessions);
        if (parsed.settings) Storage.set('flow_settings', parsed.settings);

        showToast('Workspace restored successfully! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        showToast('Failed to parse backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  });

  // Clear Session History
  clearHistoryBtn?.addEventListener('click', async () => {
    const ok = await confirm('Are you sure you want to delete all past Pomodoro session logs? Goals and schedules will remain.', 'Clear History', '⚠️');
    if (ok) {
      Storage.set('flow_history', []);
      showToast('Session history wiped', 'info');
    }
  });

  // Reset Entire Workspace
  clearAllBtn?.addEventListener('click', async () => {
    const ok = await confirm('WARNING: This will permanently delete ALL goals, time blocks, challenges, reviews, and session logs. This cannot be undone!', 'Reset Entire Workspace', '🚨');
    if (ok) {
      Storage.remove('flow_goals');
      Storage.remove('flow_timeblocks');
      Storage.remove('flow_challenges');
      Storage.remove('flow_daily_reviews');
      Storage.remove('flow_weekly_reviews');
      Storage.remove('flow_history');
      Storage.remove('flow_tasks');
      showToast('Workspace reset to defaults. Reloading...', 'info');
      setTimeout(() => window.location.href = '/app/dashboard.html', 1200);
    }
  });
}

// ─── Init Page ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar({
    pageId: 'settings',
    pageTitle: 'Settings',
    pageSubtitle: 'Workspace configuration and data portability'
  });

  loadSettings();
  setupPresets();
  setupSave();
  setupTheme();
  setupDataManagement();
});
