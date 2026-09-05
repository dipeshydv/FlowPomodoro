// Unit test runner using Node.js
const fs = require('fs');
const assert = require('assert');

// Mock localStorage
class MockStorage {
    constructor() { this.store = {}; }
    getItem(k) { return this.store[k] || null; }
    setItem(k, v) { this.store[k] = String(v); }
    removeItem(k) { delete this.store[k]; }
    clear() { this.store = {}; }
}

global.localStorage = new MockStorage();
global.document = {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {}
};

// Mock rAF & cancelAnimationFrame
let rafCallbacks = [];
global.requestAnimationFrame = (cb) => {
    const id = Math.random();
    rafCallbacks.push({ id, cb });
    return id;
};
global.cancelAnimationFrame = (id) => {
    rafCallbacks = rafCallbacks.filter(r => r.id !== id);
};

// Load storage.js
const storageSrc = fs.readFileSync('js/storage.js', 'utf8')
    .replace('export const Storage', 'const Storage')
    + '\nmodule.exports = { Storage };';
const storageMod = { exports: {} };
new Function('module', 'exports', storageSrc)(storageMod, storageMod.exports);
const Storage = storageMod.exports.Storage;

// Load timer.js
const timerSrc = fs.readFileSync('js/timer.js', 'utf8')
    .replace("import { Storage } from './storage.js';", "")
    .replace('export class TimerEngine', 'class TimerEngine')
    + '\nreturn TimerEngine;';

const TimerEngine = new Function('Storage', timerSrc)(Storage);

console.log('--- Starting TimerEngine Unit Tests ---');

// TEST 1: Basic countdown and start
{
    console.log('TEST 1: Start and derive remaining time from timestamp');
    let ticked = false;
    let completed = false;
    const timer = new TimerEngine(
        (left, total, active) => { ticked = true; },
        (mode, dur) => { completed = true; }
    );
    timer.modes.focus.time = 10;
    timer.reset();

    assert.strictEqual(timer.timeLeft, 10);
    assert.strictEqual(timer.isActive, false);

    timer.start();
    assert.strictEqual(timer.isActive, true);
    assert.strictEqual(timer.isCompleted, false);
    assert(timer.endTime > Date.now());

    timer.reset();
    assert.strictEqual(timer.isActive, false);
    console.log('  Passed!');
}

// TEST 2: Pause and Resume accuracy
{
    console.log('TEST 2: Pause snapshots exact remaining time; Resume recalculates endTime');
    let timer = new TimerEngine(() => {}, () => {});
    timer.modes.focus.time = 20;
    timer.reset();
    timer.start();

    // Simulate 3 seconds passing
    timer.endTime -= 3000;
    timer.pause();

    assert.strictEqual(timer.isActive, false);
    assert.strictEqual(timer.timeLeft, 17);

    // Check localStorage has paused status
    const saved = JSON.parse(global.localStorage.getItem('flow_timer'));
    assert.strictEqual(saved.status, 'paused');
    assert.strictEqual(saved.timeLeft, 17);

    // Wait and resume - timeLeft should still be 17
    timer.start();
    assert.strictEqual(timer.isActive, true);
    assert.strictEqual(timer.isCompleted, false);
    assert(timer.endTime > Date.now() + 16000 && timer.endTime <= Date.now() + 17000);

    timer.reset();
    console.log('  Passed!');
}

// TEST 3: Background simulation (rAF throttled / not firing, interval fires)
{
    console.log('TEST 3: Background execution where rAF halts but timestamp reaches deadline');
    let completedMode = null;
    let completeCount = 0;
    const timer = new TimerEngine(
        () => {},
        (mode) => {
            completedMode = mode;
            completeCount++;
        }
    );
    timer.modes.focus.time = 5;
    timer.reset();
    timer.start();

    // Simulate background: real world passes deadline
    timer.endTime = Date.now() - 1000;

    // Heartbeat interval fires _tick()
    timer._tick();

    assert.strictEqual(completeCount, 1);
    assert.strictEqual(completedMode, 'focus');
    assert.strictEqual(timer.isActive, false);
    assert.strictEqual(timer.isCompleted, true);

    // Repeated tick calls (e.g. visibility change or duplicate interval) must be idempotent
    timer._tick();
    timer._tick();
    assert.strictEqual(completeCount, 1, 'complete() must not fire more than once');

    console.log('  Passed!');
}

// TEST 4: Visibility change recalculation
{
    console.log('TEST 4: Visibility change triggers immediate timestamp recalculation');
    let lastTimeLeft = null;
    const timer = new TimerEngine(
        (left) => { lastTimeLeft = left; },
        () => {}
    );
    timer.modes.focus.time = 60;
    timer.reset();
    timer.start();

    // Simulate 20 seconds passing while tab was hidden
    timer.endTime -= 20000;

    // Tab becomes visible again
    global.document.hidden = false;
    timer._onVisibilityChange();

    assert.strictEqual(lastTimeLeft, 40);
    timer.reset();
    console.log('  Passed!');
}

// TEST 5: Recovery after page reload
{
    console.log('TEST 5: Recovery from localStorage for running and paused states');
    // A) Paused state
    global.localStorage.setItem('flow_timer', JSON.stringify({
        status: 'paused',
        timeLeft: 12,
        mode: 'focus',
        totalTime: 25 * 60
    }));

    let timerA = new TimerEngine(() => {}, () => {});
    assert.strictEqual(timerA.isActive, false);
    assert.strictEqual(timerA.timeLeft, 12);
    assert.strictEqual(timerA.currentMode, 'focus');

    // B) Running state (still valid)
    global.localStorage.setItem('flow_timer', JSON.stringify({
        status: 'running',
        endTime: Date.now() + 15000,
        mode: 'short',
        totalTime: 5 * 60
    }));

    let timerB = new TimerEngine(() => {}, () => {});
    assert.strictEqual(timerB.isActive, true);
    assert.strictEqual(timerB.currentMode, 'short');
    assert(timerB.timeLeft >= 14 && timerB.timeLeft <= 15);
    timerB.reset();

    console.log('  Passed!');
}

console.log('\n--- ALL 5 UNIT TESTS PASSED SUCCESSFULLY! ---');
