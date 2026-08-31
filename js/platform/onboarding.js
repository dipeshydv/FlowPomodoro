/* ==========================================================================
   FLOWPOMODORO — Onboarding Wizard JS
   Multi-step personalized setup flow for first-time or custom onboarding.
   ========================================================================== */

import { GoalStore, OnboardingStore, SettingsStore, ThemeStore } from '/js/platform/store.js';
import { showToast, formatMinutes } from '/js/platform/ui-helpers.js';

const GOAL_COLORS = ['#FFB800', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

let currentStep = 1;
let selectedMode = 'goals';

// Form Data Cache
const wizardData = {
  name: 'Deep Work Focus',
  icon: '💻',
  category: 'Career / Coding',
  dailyTarget: 90,
  weeklyTarget: 450,
  priority: 'high',
  color: '#FFB800'
};

// ─── DOM References ──────────────────────────────────────────────────────────
const dot1 = document.getElementById('dot-1');
const dot2 = document.getElementById('dot-2');
const dot3 = document.getElementById('dot-3');
const dot4 = document.getElementById('dot-4');

const step1Pane = document.getElementById('step-1');
const step2Pane = document.getElementById('step-2');
const step3Pane = document.getElementById('step-3');
const step4Pane = document.getElementById('step-4');

const nameInput = document.getElementById('ob-goal-name');
const iconInput = document.getElementById('ob-goal-icon');
const iconPreview = document.getElementById('ob-icon-preview');
const catInput = document.getElementById('ob-goal-category');
const dailyInput = document.getElementById('ob-daily-target');
const weeklyInput = document.getElementById('ob-weekly-target');
const weeklyHint = document.getElementById('ob-weekly-hint');
const colorInput = document.getElementById('ob-color');
const swatchesContainer = document.getElementById('ob-color-swatches');
const step2GoalTitle = document.getElementById('step2-goal-title');

// ─── Step Navigation ──────────────────────────────────────────────────────────
function setStep(step) {
  currentStep = step;

  // Update dots
  [dot1, dot2, dot3, dot4].forEach((dot, i) => {
    dot.classList.toggle('done', i < step);
  });

  // Hide all panes
  [step1Pane, step2Pane, step3Pane, step4Pane].forEach(p => p.style.display = 'none');

  if (step === 1) {
    step1Pane.style.display = 'block';
  } else if (step === 2) {
    step2Pane.style.display = 'block';
    step2GoalTitle.textContent = wizardData.name;
  } else if (step === 3) {
    step3Pane.style.display = 'block';
  } else if (step === 4) {
    step4Pane.style.display = 'block';
    updateSummary();
  }
}

function updateSummary() {
  document.getElementById('summary-goal-name').textContent = `${wizardData.icon} ${wizardData.name}`;
  document.getElementById('summary-daily-target').textContent = `${formatMinutes(wizardData.dailyTarget)} / day`;
  const modeNames = {
    goals: '🎯 Goal-Based Focus',
    blocking: '📅 Time Blocking',
    simple: '⏱️ Minimalist Timer',
    challenge: '🔥 Habit Challenge'
  };
  document.getElementById('summary-mode').textContent = modeNames[selectedMode] || selectedMode;
}

// ─── Color Swatches ───────────────────────────────────────────────────────────
function setupColorSwatches() {
  if (!swatchesContainer) return;
  swatchesContainer.innerHTML = GOAL_COLORS.map(c => `
    <div class="color-swatch ${c === colorInput.value ? 'selected' : ''}" 
         data-color="${c}" 
         style="background:${c};"></div>
  `).join('');

  swatchesContainer.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      swatchesContainer.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      colorInput.value = swatch.dataset.color;
      wizardData.color = swatch.dataset.color;
      iconPreview.style.borderColor = swatch.dataset.color;
    });
  });
}

// ─── Setup Mode Cards ─────────────────────────────────────────────────────────
function setupModeCards() {
  const cards = document.querySelectorAll('.mode-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMode = card.dataset.mode;
    });
  });
}

// ─── Setup Priorities ─────────────────────────────────────────────────────────
function setupPriorityOptions() {
  const options = document.querySelectorAll('.priority-option');
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      const radio = opt.querySelector('input');
      if (radio) {
        radio.checked = true;
        wizardData.priority = radio.value;
      }
    });
  });
}

// ─── Setup Step Buttons ───────────────────────────────────────────────────────
function setupButtons() {
  // Step 1 Next
  document.getElementById('step1-next-btn')?.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      showToast('Please enter a goal or project name', 'error');
      nameInput.focus();
      return;
    }
    wizardData.name = name;
    wizardData.icon = iconInput.value.trim() || '💻';
    wizardData.category = catInput.value.trim() || 'General';
    wizardData.dailyTarget = parseInt(dailyInput.value) || 60;
    wizardData.weeklyTarget = wizardData.dailyTarget * 5;
    weeklyInput.value = wizardData.weeklyTarget;
    weeklyHint.textContent = `= ${formatMinutes(wizardData.weeklyTarget)} / week`;
    setStep(2);
  });

  // Step 2 Back & Next
  document.getElementById('step2-back-btn')?.addEventListener('click', () => setStep(1));
  document.getElementById('step2-next-btn')?.addEventListener('click', () => {
    wizardData.weeklyTarget = parseInt(weeklyInput.value) || (wizardData.dailyTarget * 5);
    setStep(3);
  });

  // Step 3 Back & Next
  document.getElementById('step3-back-btn')?.addEventListener('click', () => setStep(2));
  document.getElementById('step3-next-btn')?.addEventListener('click', () => setStep(4));

  // Step 4 Launch
  document.getElementById('launch-app-btn')?.addEventListener('click', () => {
    // Save Goal
    const createdGoal = GoalStore.save({
      name: wizardData.name,
      icon: wizardData.icon,
      category: wizardData.category,
      dailyTarget: wizardData.dailyTarget,
      weeklyTarget: wizardData.weeklyTarget,
      priority: wizardData.priority,
      color: wizardData.color,
    });

    // Cache active goal for timer
    sessionStorage.setItem('flow_active_goal', createdGoal.id);

    // Save Default Mode in Settings
    SettingsStore.save({ defaultMode: selectedMode });

    // Mark Onboarding Complete
    OnboardingStore.complete(selectedMode);

    showToast('Workspace configured! Launching...', 'success');
    setTimeout(() => {
      window.location.href = '/app/dashboard.html';
    }, 600);
  });

  // Dynamic inputs
  iconInput?.addEventListener('input', () => {
    iconPreview.textContent = iconInput.value.trim() || '💻';
  });

  dailyInput?.addEventListener('input', () => {
    const mins = parseInt(dailyInput.value) || 60;
    wizardData.dailyTarget = mins;
  });

  weeklyInput?.addEventListener('input', () => {
    const mins = parseInt(weeklyInput.value) || 300;
    weeklyHint.textContent = `= ${formatMinutes(mins)} / week`;
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ThemeStore.init();
  setupColorSwatches();
  setupPriorityOptions();
  setupModeCards();
  setupButtons();
});
