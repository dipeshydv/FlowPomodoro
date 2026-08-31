import assert from 'node:assert';
import fs from 'node:fs';

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

// Set Focus = 50 in settings
localStorage.setItem('flow_settings', JSON.stringify({ focus: 50, short: 5, long: 15 }));

const timerCode = fs.readFileSync('js/timer.js', 'utf8')
  .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
  .replace(/export\s+class\s+TimerEngine/g, 'class TimerEngine');

const storageCode = fs.readFileSync('js/storage.js', 'utf8')
  .replace(/export\s+const\s+Storage/g, 'const Storage');

const fn = new Function(storageCode + '\n' + timerCode + '\nreturn TimerEngine;');
const TimerEngine = fn();

const ticks = [];
const timer = new TimerEngine((tl, tot, active) => ticks.push({ tl, tot, active }), () => {});

console.log('Timer modes:', timer.modes);
console.log('Timer initial timeLeft:', timer.timeLeft, '(' + timer.timeLeft/60 + ' mins)');
console.log('Timer initial totalTime:', timer.totalTime, '(' + timer.totalTime/60 + ' mins)');

assert.strictEqual(timer.timeLeft, 3000, 'Initial timeLeft must be 3000 (50 mins)');
assert.strictEqual(timer.totalTime, 3000, 'Initial totalTime must be 3000 (50 mins)');
console.log('✓ TimerEngine correctly initializes with 50 minutes when flow_settings.focus = 50');
