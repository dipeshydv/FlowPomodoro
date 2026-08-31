import assert from 'node:assert';
import fs from 'node:fs';

// Mock storage
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
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

const fn = new Function(storageCode + '\n' + storeCode + '\nreturn { GoalStore, SessionStore, SettingsStore, getLocalDateKey, today };');
const { GoalStore, SessionStore, SettingsStore, getLocalDateKey, today } = fn();

console.log('--- SETUP: Creating User Goals ---');
localStorage.clear();

const gIelts = GoalStore.save({ id: 'goal_ielts', name: 'IELTS', type: 'habit', dailyTarget: 300, weeklyTarget: 2100, isActive: true });
const gAndroid = GoalStore.save({ id: 'goal_android', name: 'Android Development', type: 'habit', dailyTarget: 300, weeklyTarget: 2100, isActive: true });
const gGym = GoalStore.save({ id: 'goal_gym', name: 'GYM', type: 'habit', dailyTarget: 60, weeklyTarget: 360, isActive: true });

assert.strictEqual(GoalStore.getAll().length, 3);
console.log('✓ 3 Goals created: IELTS (5h), Android Dev (5h), GYM (1h).');

console.log('--- TEST 1: Complete one 25-minute IELTS Pomodoro ---');
SessionStore.add({
  date: today(),
  type: 'focus',
  duration: 1500, // 25 minutes in seconds
  goalId: gIelts.id
});

let ieltsMins = SessionStore.todayMinutesForGoal(gIelts.id);
let ieltsSessions = SessionStore.getToday().filter(s => s.goalId === gIelts.id).length;
let ieltsProg = Math.min(100, (ieltsMins / gIelts.dailyTarget) * 100);

assert.strictEqual(ieltsSessions, 1);
assert.strictEqual(ieltsMins, 25);
assert.strictEqual(ieltsProg.toFixed(2), '8.33');
assert.strictEqual(SessionStore.todayCount(), 1);
assert.strictEqual(SessionStore.todayMinutes(), 25);
console.log('✓ TEST 1 Passed: IELTS = 1 session, 25m, 8.33% progress. Total = 25m.');

console.log('--- TEST 2: Complete another 25-minute IELTS Pomodoro ---');
SessionStore.add({
  date: today(),
  type: 'focus',
  duration: 1500,
  goalId: gIelts.id
});

ieltsMins = SessionStore.todayMinutesForGoal(gIelts.id);
ieltsSessions = SessionStore.getToday().filter(s => s.goalId === gIelts.id).length;
ieltsProg = Math.min(100, (ieltsMins / gIelts.dailyTarget) * 100);

assert.strictEqual(ieltsSessions, 2);
assert.strictEqual(ieltsMins, 50);
assert.strictEqual(ieltsProg.toFixed(2), '16.67');
assert.strictEqual(SessionStore.todayMinutes(), 50);
console.log('✓ TEST 2 Passed: IELTS = 2 sessions, 50m, 16.67% progress. Total = 50m.');

console.log('--- TEST 3: Complete a 25-minute Android Development Pomodoro ---');
SessionStore.add({
  date: today(),
  type: 'focus',
  duration: 1500,
  goalId: gAndroid.id
});

let androidMins = SessionStore.todayMinutesForGoal(gAndroid.id);
let androidSessions = SessionStore.getToday().filter(s => s.goalId === gAndroid.id).length;
let androidProg = Math.min(100, (androidMins / gAndroid.dailyTarget) * 100);

assert.strictEqual(androidSessions, 1);
assert.strictEqual(androidMins, 25);
assert.strictEqual(androidProg.toFixed(2), '8.33');

// Ensure IELTS was untouched
assert.strictEqual(SessionStore.todayMinutesForGoal(gIelts.id), 50);
assert.strictEqual(SessionStore.getToday().filter(s => s.goalId === gIelts.id).length, 2);
console.log('✓ TEST 3 Passed: Android = 1 session, 25m, 8.33%. IELTS remains 2 sessions, 50m.');

console.log('--- TEST 4: Complete a 25-minute GYM session ---');
SessionStore.add({
  date: today(),
  type: 'focus',
  duration: 1500,
  goalId: gGym.id
});

let gymMins = SessionStore.todayMinutesForGoal(gGym.id);
let gymSessions = SessionStore.getToday().filter(s => s.goalId === gGym.id).length;
let gymProg = Math.min(100, (gymMins / gGym.dailyTarget) * 100);

assert.strictEqual(gymSessions, 1);
assert.strictEqual(gymMins, 25);
assert.strictEqual(gymProg.toFixed(2), '41.67');
console.log('✓ TEST 4 Passed: GYM = 1 session, 25m, 41.67% daily progress.');

console.log('--- TEST 5: Complete enough IELTS sessions to exceed 5 hours (capped at 100%) ---');
// Add 11 more 25m IELTS sessions (250m + 50m = 325m > 300m target)
for (let i = 0; i < 11; i++) {
  SessionStore.add({ date: today(), type: 'focus', duration: 1500, goalId: gIelts.id });
}
ieltsMins = SessionStore.todayMinutesForGoal(gIelts.id);
ieltsProg = Math.min(100, (ieltsMins / gIelts.dailyTarget) * 100);
assert.strictEqual(ieltsMins, 325);
assert.strictEqual(ieltsProg, 100, 'Progress must be capped at 100%');
console.log('✓ TEST 5 Passed: IELTS 325m / 300m target -> Progress = 100% (never > 100%).');

console.log('--- TEST 6: Tomorrow date isolation ---');
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = getLocalDateKey(tomorrow);

assert.strictEqual(SessionStore.getByDate(tomorrowStr).length, 0);
assert.strictEqual(SessionStore.minutesForGoalOnDate(gIelts.id, tomorrowStr), 0);
console.log('✓ TEST 6 Passed: Tomorrow has 0 focus minutes; yesterday/today records isolated.');

console.log('--- TEST 7: Analytics total calculation (No 100h bug) ---');
const allSessions = SessionStore.getAll();
const totalFocusMins = allSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
// 13 IELTS (325m) + 1 Android (25m) + 1 GYM (25m) = 375 minutes = 6h 15m
assert.strictEqual(totalFocusMins, 375);
assert.strictEqual(allSessions.length, 15);
console.log('✓ TEST 7 Passed: 15 Pomodoros = 375 minutes (6h 15m). No 100h calculation error.');

console.log('--- TEST 8: Per-Goal Breakdown Sum Matching ---');
const breakdownIeltsMins = SessionStore.getByGoal(gIelts.id).reduce((sum, s) => sum + s.durationMinutes, 0);
const breakdownAndroidMins = SessionStore.getByGoal(gAndroid.id).reduce((sum, s) => sum + s.durationMinutes, 0);
const breakdownGymMins = SessionStore.getByGoal(gGym.id).reduce((sum, s) => sum + s.durationMinutes, 0);

assert.strictEqual(breakdownIeltsMins + breakdownAndroidMins + breakdownGymMins, totalFocusMins);
console.log('✓ TEST 8 Passed: Sum across goals (325m + 25m + 25m = 375m) equals total focus time.');

console.log('--- TEST 9: Backward Compatibility Normalization ---');
const legacySession1 = SessionStore.normalizeSession({ id: 101, date: '2026-08-30', type: 'focus', duration: 3000 }); // 50m stored as 3000s
assert.strictEqual(legacySession1.durationMinutes, 50);

const legacySession2 = SessionStore.normalizeSession({ id: 102, date: '2026-08-30', type: 'focus', duration: 25 }); // 25m stored as legacy 25
assert.strictEqual(legacySession2.durationMinutes, 25);

const legacySession3 = SessionStore.normalizeSession({ id: 103, date: '2026-08-30', type: 'focus', duration: 1500, goalName: 'IELTS' });
assert.strictEqual(legacySession3.goalId, gIelts.id, 'Matches goalId by goalName');
console.log('✓ TEST 9 Passed: Legacy sessions normalized correctly.');

console.log('================ ALL 9 DATA-FLOW AUDIT TESTS PASSED (100% OK) ================');
