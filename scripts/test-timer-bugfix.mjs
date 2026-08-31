import assert from 'node:assert';
import fs from 'node:fs';

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

// Evaluate timer & storage modules
const timerCode = fs.readFileSync('js/timer.js', 'utf8')
  .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
  .replace(/export\s+class\s+TimerEngine/g, 'class TimerEngine');

const storageCode = fs.readFileSync('js/storage.js', 'utf8')
  .replace(/export\s+const\s+Storage/g, 'const Storage');

const fn = new Function(storageCode + '\n' + timerCode + '\nreturn { TimerEngine, Storage };');
const { TimerEngine, Storage } = fn();

console.log('--- TEST 1: Default Settings (Never configured) ---');
localStorage.clear();
const defaultTimer = new TimerEngine(() => {}, () => {});
assert.strictEqual(defaultTimer.modes.focus.time, 25 * 60, 'Default focus must remain 25m fallback');
assert.strictEqual(defaultTimer.timeLeft, 25 * 60, 'Default initial timeLeft must be 25m');
assert.strictEqual(defaultTimer.totalTime, 25 * 60, 'Default initial totalTime must be 25m');
console.log('✓ Default 25m fallback preserved.');

console.log('--- TEST 2: User configured Focus = 50 minutes ---');
Storage.set('flow_settings', { focus: 50, short: 10, long: 20 });
const customTimer = new TimerEngine(() => {}, () => {});
assert.strictEqual(customTimer.modes.focus.time, 50 * 60, 'Custom focus must be 50m');
assert.strictEqual(customTimer.timeLeft, 50 * 60, 'Initial timeLeft must immediately be 50m (3000s)');
assert.strictEqual(customTimer.totalTime, 50 * 60, 'Initial totalTime must immediately be 50m (3000s)');
console.log('✓ TimerEngine initializes with 50m immediately on startup.');

console.log('--- TEST 3: Mode Switching (Short Break -> Focus) ---');
customTimer.switchMode('short');
assert.strictEqual(customTimer.currentMode, 'short');
assert.strictEqual(customTimer.timeLeft, 10 * 60, 'Short break duration must be 10m');

customTimer.switchMode('focus');
assert.strictEqual(customTimer.currentMode, 'focus');
assert.strictEqual(customTimer.timeLeft, 50 * 60, 'Focus duration must return to 50m');
console.log('✓ Mode switching retains custom durations.');

console.log('--- TEST 4: String to number type safety ---');
Storage.set('flow_settings', { focus: '45', short: '7', long: '18' });
const stringTimer = new TimerEngine(() => {}, () => {});
assert.strictEqual(stringTimer.modes.focus.time, 45 * 60);
assert.strictEqual(stringTimer.timeLeft, 45 * 60);
console.log('✓ String values in localStorage parsed safely.');

console.log('================ ALL TIMER TESTS PASSED (100% OK) ================');
