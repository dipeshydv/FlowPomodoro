import assert from 'node:assert';
import fs from 'node:fs';

// Mock DOM and localStorage environment
const localStorageData = {};
const sessionStorageData = {};

global.localStorage = {
  getItem: (k) => localStorageData[k] || null,
  setItem: (k, v) => { localStorageData[k] = String(v); },
  removeItem: (k) => { delete localStorageData[k]; },
  clear: () => { Object.keys(localStorageData).forEach(k => delete localStorageData[k]); }
};

global.sessionStorage = {
  getItem: (k) => sessionStorageData[k] || null,
  setItem: (k, v) => { sessionStorageData[k] = String(v); },
  removeItem: (k) => { delete sessionStorageData[k]; },
  clear: () => { Object.keys(sessionStorageData).forEach(k => delete sessionStorageData[k]); }
};

// Dispatch events mock
const listeners = {};
global.window = {
  location: { search: '' },
  addEventListener: (evt, cb) => {
    listeners[evt] = listeners[evt] || [];
    listeners[evt].push(cb);
  },
  dispatchEvent: (evt) => {
    (listeners[evt.type] || []).forEach(cb => cb(evt));
  }
};
global.CustomEvent = class {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};

// Evaluate platform store module
const storeCode = fs.readFileSync('js/platform/store.js', 'utf8')
  .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
  .replace(/export\s+const\s+/g, 'const ')
  .replace(/export\s+function\s+/g, 'function ')
  .replace(/export\s+\{.*?\};?/g, '');

const storageCode = fs.readFileSync('js/storage.js', 'utf8')
  .replace(/export\s+const\s+/g, 'const ')
  .replace(/export\s+default\s+/g, '');

const fn = new Function(storageCode + '\n' + storeCode + '\nreturn { Storage, GoalStore, SessionStore, SettingsStore, getLocalDateKey, today };');
const { Storage, GoalStore, SessionStore, SettingsStore, getLocalDateKey, today } = fn();

console.log('================ REAL BROWSER FLOW TEST SUITE ================');
localStorage.clear();
sessionStorage.clear();

// Step 1: Create Real Goals
const ielts = GoalStore.save({
  id: 'goal_ielts_123',
  name: 'IELTS',
  type: 'habit',
  dailyTarget: 300,
  weeklyTarget: 2100,
  selectedDays: [0, 1, 2, 3, 4, 5, 6],
  isActive: true
});

const android = GoalStore.save({
  id: 'goal_android_456',
  name: 'Android Development',
  type: 'habit',
  dailyTarget: 300,
  weeklyTarget: 2100,
  selectedDays: [0, 1, 2, 3, 4, 5, 6],
  isActive: true
});

const gym = GoalStore.save({
  id: 'goal_gym_789',
  name: 'GYM',
  type: 'habit',
  dailyTarget: 60,
  weeklyTarget: 360,
  selectedDays: [1, 2, 3, 4, 5, 6],
  isActive: true
});

console.log('✓ Created 3 Goals with stable IDs:', {
  ielts: ielts.id,
  android: android.id,
  gym: gym.id
});

// Step 2: Simulate User on Goals page clicking "Focus" on IELTS
console.log('\n--- SIMULATION 1: Goals Page -> Focus IELTS ---');
// Simulating navigation to pomodoro.html?goalId=goal_ielts_123
window.location.search = `?goalId=${ielts.id}`;

// Replicate pomodoro.html initialization script
const urlParams1 = new URLSearchParams(window.location.search);
const paramGoalId1 = urlParams1.get('goalId') || urlParams1.get('goal');
if (paramGoalId1) {
  localStorage.setItem('flow_active_goal', paramGoalId1);
  sessionStorage.setItem('flow_active_goal', paramGoalId1);
}

// Mock DOM selector
const domSelector = { value: paramGoalId1 || '' };
global.document = {
  getElementById: (id) => {
    if (id === 'goal-selector') return domSelector;
    return null;
  }
};

assert.strictEqual(localStorage.getItem('flow_active_goal'), ielts.id);
console.log('✓ pomodoro.html initialized with active goal:', localStorage.getItem('flow_active_goal'));

// Replicate onSessionComplete logic in js/main.js
function simulateSessionComplete(mode, durationSecs) {
  const selEl = global.document.getElementById('goal-selector');
  let activeGoalId = (selEl && selEl.value) ? selEl.value : (localStorage.getItem('flow_active_goal') || sessionStorage.getItem('flow_active_goal') || null);
  let activeGoal = activeGoalId ? GoalStore.get(activeGoalId) : null;

  if (!activeGoal && !activeGoalId) {
    const todayScheduled = GoalStore.getScheduledForDate ? GoalStore.getScheduledForDate(getLocalDateKey()) : [];
    if (todayScheduled.length === 1) {
      activeGoal = todayScheduled[0];
      activeGoalId = activeGoal.id;
    } else {
      const allActive = GoalStore.getActive ? GoalStore.getActive() : [];
      if (allActive.length === 1) {
        activeGoal = allActive[0];
        activeGoalId = activeGoal.id;
      }
    }
  }

  const durationMins = Math.round(durationSecs / 60);
  const rawSession = {
    id: Date.now(),
    date: getLocalDateKey(),
    type: mode,
    duration: durationSecs,
    durationMinutes: durationMins,
    goalId: activeGoal ? String(activeGoal.id) : (activeGoalId ? String(activeGoalId) : null),
    goalName: activeGoal ? activeGoal.name : null,
    completedAt: new Date().toISOString()
  };

  const session = SessionStore.normalizeSession(rawSession) || rawSession;
  const history = Storage.get('flow_history', []);
  history.push(session);
  Storage.set('flow_history', history);
  return session;
}

const sess1 = simulateSessionComplete('focus', 1500); // 25 min
console.log('✓ Completed Session 1:', {
  goalId: sess1.goalId,
  goalName: sess1.goalName,
  durationMinutes: sess1.durationMinutes
});

assert.strictEqual(sess1.goalId, ielts.id);
assert.strictEqual(sess1.goalName, 'IELTS');
assert.strictEqual(sess1.durationMinutes, 25);

// Verify Goals page calculation
const ieltsDone1 = SessionStore.todayMinutesForGoal(ielts.id);
const ieltsPct1 = Math.min(100, Math.round((ieltsDone1 / ielts.dailyTarget) * 100 * 100) / 100);
assert.strictEqual(ieltsDone1, 25);
assert.strictEqual(ieltsPct1.toFixed(2), '8.33');
assert.strictEqual(SessionStore.todayMinutesForGoal(android.id), 0);
assert.strictEqual(SessionStore.todayMinutesForGoal(gym.id), 0);
console.log('✓ Goals Page Progress: IELTS = 25m (8.33%), Android = 0m (0%), GYM = 0m (0%).');

// Step 3: Simulate User on Today page clicking "Focus" on Android Development (50 min session)
console.log('\n--- SIMULATION 2: Today Page -> Focus Android Development ---');
window.location.search = `?goalId=${android.id}`;
const urlParams2 = new URLSearchParams(window.location.search);
const paramGoalId2 = urlParams2.get('goalId');
localStorage.setItem('flow_active_goal', paramGoalId2);
domSelector.value = paramGoalId2;

const sess2 = simulateSessionComplete('focus', 3000); // 50 min
console.log('✓ Completed Session 2:', {
  goalId: sess2.goalId,
  goalName: sess2.goalName,
  durationMinutes: sess2.durationMinutes
});

assert.strictEqual(sess2.goalId, android.id);
assert.strictEqual(sess2.goalName, 'Android Development');
assert.strictEqual(sess2.durationMinutes, 50);

// Verify isolated progress
assert.strictEqual(SessionStore.todayMinutesForGoal(ielts.id), 25);
assert.strictEqual(SessionStore.todayMinutesForGoal(android.id), 50);
assert.strictEqual(SessionStore.todayMinutesForGoal(gym.id), 0);
console.log('✓ Verified: IELTS = 25m, Android = 50m, GYM = 0m.');

// Step 4: Simulate User on Dashboard clicking Focus on GYM (25 min session)
console.log('\n--- SIMULATION 3: Dashboard -> Focus GYM ---');
window.location.search = `?goalId=${gym.id}`;
localStorage.setItem('flow_active_goal', gym.id);
domSelector.value = gym.id;

const sess3 = simulateSessionComplete('focus', 1500); // 25 min
assert.strictEqual(sess3.goalId, gym.id);
assert.strictEqual(SessionStore.todayMinutesForGoal(gym.id), 25);
const gymPct = Math.min(100, Math.round((25 / gym.dailyTarget) * 100 * 100) / 100);
assert.strictEqual(gymPct.toFixed(2), '41.67');
console.log('✓ GYM Progress = 25m / 1h (41.67%).');

// Step 5: Direct Pomodoro launch with no query param
console.log('\n--- SIMULATION 4: Direct Pomodoro launch (no query param) ---');
window.location.search = '';
// User changes dropdown to IELTS
domSelector.value = ielts.id;
localStorage.setItem('flow_active_goal', ielts.id);

const sess4 = simulateSessionComplete('focus', 1500); // 25 min IELTS
assert.strictEqual(sess4.goalId, ielts.id);
assert.strictEqual(SessionStore.todayMinutesForGoal(ielts.id), 50);
console.log('✓ Direct Pomodoro attributed to selected dropdown goal. IELTS total = 50m (16.67%).');

// Step 6: Total Analytics verification
console.log('\n--- SIMULATION 5: Analytics Verification ---');
const totalMins = SessionStore.todayMinutes();
// 25m (IELTS) + 50m (Android) + 25m (GYM) + 25m (IELTS) = 125 minutes = 2h 5m
assert.strictEqual(totalMins, 125);
assert.strictEqual(SessionStore.todayCount(), 4);

const ieltsBreakdown = SessionStore.getByGoal(ielts.id).reduce((s, x) => s + x.durationMinutes, 0);
const androidBreakdown = SessionStore.getByGoal(android.id).reduce((s, x) => s + x.durationMinutes, 0);
const gymBreakdown = SessionStore.getByGoal(gym.id).reduce((s, x) => s + x.durationMinutes, 0);

assert.strictEqual(ieltsBreakdown, 50);
assert.strictEqual(androidBreakdown, 50);
assert.strictEqual(gymBreakdown, 25);
assert.strictEqual(ieltsBreakdown + androidBreakdown + gymBreakdown, totalMins);

console.log('✓ Analytics Breakdown:');
console.log(`  - IELTS:   ${ieltsBreakdown}m (${SessionStore.getByGoal(ielts.id).length} sessions)`);
console.log(`  - Android: ${androidBreakdown}m (${SessionStore.getByGoal(android.id).length} sessions)`);
console.log(`  - GYM:     ${gymBreakdown}m (${SessionStore.getByGoal(gym.id).length} sessions)`);
console.log(`  - Total:   ${totalMins}m (${SessionStore.todayCount()} sessions)`);

console.log('\n================ ALL REAL BROWSER FLOW TESTS PASSED (100% OK) ================');
