import { Storage } from './storage.js';

export class TimerEngine {
    constructor(onTick, onComplete) {
        this.modes = {
            focus: { time: 25 * 60 },
            short: { time:  5 * 60 },
            long:  { time: 15 * 60 }
        };

        this.currentMode = 'focus';
        this.timeLeft    = this.modes.focus.time;
        this.totalTime   = this.modes.focus.time;
        this.isActive    = false;

        // Timestamps used for drift-free counting
        this.endTime  = null;
        this.rafId    = null;

        this.onTick     = onTick;
        this.onComplete = onComplete;

        this.loadSettings();
        this.recover();
    }

    // ─── Settings ──────────────────────────────────────────────────────────
    loadSettings() {
        const saved = Storage.get('flow_settings');
        if (saved) {
            if (saved.focus) this.modes.focus.time = saved.focus * 60;
            if (saved.short) this.modes.short.time = saved.short * 60;
            if (saved.long)  this.modes.long.time  = saved.long  * 60;
        }
    }

    // ─── Core Controls ─────────────────────────────────────────────────────
    start() {
        if (this.isActive) return;

        // BUG FIX: always set endTime from current timeLeft so resume works
        this.endTime  = Date.now() + this.timeLeft * 1000;
        this.isActive = true;

        Storage.set('flow_timer', {
            endTime:     this.endTime,
            mode:        this.currentMode,
            totalTime:   this.totalTime
        });

        this._tick();
    }

    pause() {
        if (!this.isActive) return;
        this.isActive = false;
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
        Storage.remove('flow_timer');
        this.onTick(this.timeLeft, this.totalTime, false);
    }

    reset() {
        this.pause();
        this.endTime  = null;
        this.timeLeft = this.modes[this.currentMode].time;
        this.totalTime = this.timeLeft;
        this.onTick(this.timeLeft, this.totalTime, false);
    }

    switchMode(mode) {
        this.currentMode = mode;
        this.reset();
    }

    complete() {
        this.isActive = false;
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
        this.endTime = null;
        Storage.remove('flow_timer');
        this.onComplete(this.currentMode, this.modes[this.currentMode].time);
    }

    // ─── Internal Loop ─────────────────────────────────────────────────────
    _tick() {
        if (!this.isActive) return;

        const remaining = Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
        this.timeLeft = remaining;
        this.onTick(this.timeLeft, this.totalTime, true);

        if (remaining <= 0) {
            this.complete();
            return;
        }

        this.rafId = requestAnimationFrame(() => this._tick());
    }

    // ─── Recovery after page reload ─────────────────────────────────────────
    recover() {
        const saved = Storage.get('flow_timer');
        if (!saved) return;

        const remaining = Math.ceil((saved.endTime - Date.now()) / 1000);

        if (remaining > 0) {
            this.currentMode = saved.mode || 'focus';
            this.totalTime   = saved.totalTime || this.modes[this.currentMode].time;
            this.timeLeft    = remaining;
            this.endTime     = saved.endTime;
            this.isActive    = true;
            this.onTick(this.timeLeft, this.totalTime, true);
            this._tick();
        } else {
            Storage.remove('flow_timer');
        }
    }
}
