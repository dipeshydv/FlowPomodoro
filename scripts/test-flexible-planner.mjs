import assert from 'node:assert';

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

import { GoalStore, BlockStore, SettingsStore, timeToMins, minsToTime } from '../js/platform/store.js';

console.log('--- TEST 1: Flexible User Goals & 7-Day Recurrence ---');

// User A: IELTS Mon-Fri (1,2,3,4,5)
const userA = { id: 'ielts', name: 'IELTS Focus', type: 'habit', recurrenceType: 'weekdays', selectedDays: [1,2,3,4,5], dailyTarget: 180, weeklyTarget: 900, isActive: true };
// 2026-08-31 is Monday (day 1)
assert.strictEqual(GoalStore.isScheduledForDate(userA, '2026-08-31'), true, 'User A should be scheduled on Monday');
assert.strictEqual(GoalStore.isRestDay(userA, '2026-08-31'), false, 'User A should NOT be resting on Monday');
// 2026-09-06 is Sunday (day 0)
assert.strictEqual(GoalStore.isScheduledForDate(userA, '2026-09-06'), false, 'User A should not be scheduled on Sunday');
assert.strictEqual(GoalStore.isRestDay(userA, '2026-09-06'), true, 'User A SHOULD be resting on Sunday');

// User B: Gym Mon/Wed/Fri (1,3,5)
const userB = { id: 'gym', name: 'Gym & Fitness', type: 'habit', recurrenceType: 'selected_days', selectedDays: [1,3,5], dailyTarget: 60, weeklyTarget: 180, isActive: true };
assert.strictEqual(GoalStore.isScheduledForDate(userB, '2026-08-31'), true, 'User B scheduled on Monday');
assert.strictEqual(GoalStore.isScheduledForDate(userB, '2026-09-01'), false, 'User B not scheduled on Tuesday');
assert.strictEqual(GoalStore.isRestDay(userB, '2026-09-01'), true, 'User B rest day on Tuesday');
assert.strictEqual(GoalStore.isScheduledForDate(userB, '2026-09-02'), true, 'User B scheduled on Wednesday');

// User C: Reading Sun-Sat (0,1,2,3,4,5,6)
const userC = { id: 'reading', name: 'Reading', type: 'habit', recurrenceType: 'daily', selectedDays: [0,1,2,3,4,5,6], dailyTarget: 30, weeklyTarget: 210, isActive: true };
assert.strictEqual(GoalStore.isScheduledForDate(userC, '2026-08-31'), true);
assert.strictEqual(GoalStore.isScheduledForDate(userC, '2026-09-06'), true);
assert.strictEqual(GoalStore.isRestDay(userC, '2026-09-06'), false);

// User D: Freelancing Tue/Thu/Sat (2,4,6)
const userD = { id: 'freelance', name: 'Client Project', type: 'habit', recurrenceType: 'selected_days', selectedDays: [2,4,6], dailyTarget: 240, weeklyTarget: 720, isActive: true };
assert.strictEqual(GoalStore.isScheduledForDate(userD, '2026-08-31'), false, 'User D rest on Mon');
assert.strictEqual(GoalStore.isRestDay(userD, '2026-08-31'), true, 'User D rest day on Mon');
assert.strictEqual(GoalStore.isScheduledForDate(userD, '2026-09-01'), true, 'User D active on Tue');

// User E: Milestone Outcome Goal (No recurrence)
const userE = { id: 'thesis', name: 'Finish Paper Draft', type: 'goal', recurrenceType: 'none', selectedDays: [], dailyTarget: 60, weeklyTarget: 300, isActive: true };
assert.strictEqual(GoalStore.isScheduledForDate(userE, '2026-08-31'), true, 'Outcome goal is always active/flexible');
assert.strictEqual(GoalStore.isRestDay(userE, '2026-08-31'), false, 'Outcome goal NEVER receives rest day status');
assert.strictEqual(GoalStore.isRestDay(userE, '2026-09-06'), false, 'Outcome goal NEVER receives rest day status on Sunday');

console.log('✓ All 5 User Schedule test cases passed.');

console.log('--- TEST 2: Skip Day Isolation ---');
GoalStore.save(userA);
assert.strictEqual(GoalStore.isScheduledForDate(GoalStore.get('ielts'), '2026-08-31'), true);
GoalStore.toggleSkipForDate('ielts', '2026-08-31');
assert.strictEqual(GoalStore.isScheduledForDate(GoalStore.get('ielts'), '2026-08-31'), false, 'Skipped date is not scheduled');
assert.strictEqual(GoalStore.isScheduledForDate(GoalStore.get('ielts'), '2026-09-01'), true, 'Other recurring days remain scheduled');
GoalStore.toggleSkipForDate('ielts', '2026-08-31');
assert.strictEqual(GoalStore.isScheduledForDate(GoalStore.get('ielts'), '2026-08-31'), true, 'Unskipped date is scheduled again');
console.log('✓ Skip day isolation passed.');

console.log('--- TEST 3: Arbitrary Time Blocks & Overlap Detection ---');
const b1 = { id: 'b1', date: '2026-08-31', startTime: '08:15', endTime: '10:45', title: 'Deep Work A' };
const b2 = { id: 'b2', date: '2026-08-31', startTime: '10:45', endTime: '11:00', title: 'Touch Boundary' };
const b3 = { id: 'b3', date: '2026-08-31', startTime: '09:30', endTime: '11:00', title: 'Overlap Intersect' };
const b4 = { id: 'b4', date: '2026-08-31', startTime: '13:20', endTime: '15:50', title: 'Afternoon Work' };

BlockStore.save(b1);

const conflictsB2 = BlockStore.checkOverlap(b2, 'b2');
assert.strictEqual(conflictsB2.length, 0, 'Touching boundary blocks 08:15-10:45 and 10:45-11:00 MUST NOT overlap');

const conflictsB3 = BlockStore.checkOverlap(b3, 'b3');
assert.strictEqual(conflictsB3.length, 1, 'Intersecting blocks 08:15-10:45 and 09:30-11:00 MUST overlap');
assert.strictEqual(conflictsB3[0].id, 'b1');

const conflictsB4 = BlockStore.checkOverlap(b4, 'b4');
assert.strictEqual(conflictsB4.length, 0, 'Separate blocks 08:15-10:45 and 13:20-15:50 MUST NOT overlap');

console.log('✓ Overlap detection rules passed.');
console.log('================ ALL VERIFICATIONS PASSED ================');
