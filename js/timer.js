import { Storage } from './storage.js';

/**
 * TimerEngine — timestamp-based Pomodoro timer.
 *
 * Architecture: time is always derived from (endTime - Date.now()), never
 * decremented. Two independent drivers keep the loop alive:
 *
 *  1. requestAnimationFrame — smooth UI updates when the tab is visible.
 *     Browsers halt rAF entirely when the tab is hidden, so it is not
 *     sufficient alone for background detection.
 *
 *  2. setInterval(~1000ms) — background heartbeat. Browsers throttle
 *     setInterval in hidden tabs to ≈1–2 seconds but it *does* keep firing,
 *     unlike rAF. This allows detecting timer expiry within ~2 seconds even
 *     when the page is backgrounded or in a minimized window.
 *
 * Completion guard: this.isCompleted ensures complete() is idempotent even
 * if both rAF and the interval fire at the same moment, or if visibilitychange
 * triggers an extra _tick() after the timer already finished.
 */
export class TimerEngine {
    constructor(onTick, onComplete, storageKey = 'flow_timer', shouldLoadSettings = true) {
        this.modes = {
            focus: { time: 25 * 60 },
            short: { time:  5 * 60 },
            long:  { time: 15 * 60 }
        };

        this.currentMode = 'focus';
        this.storageKey  = storageKey;
        this.isActive    = false;
        this.isCompleted = false;      // guards against duplicate completion
        this.endTime     = null;
        this.pausedAt    = null;       // timestamp when paused (for resume)
        this.rafId       = null;
        this.intervalId  = null;       // background heartbeat

        this.onTick     = onTick;
        this.onComplete = onComplete;

        if (shouldLoadSettings) {
            this.loadSettings();
        }

        this.timeLeft  = this.modes.focus.time;
        this.totalTime = this.modes.focus.time;

        // Handle visibility changes — recalculate from timestamp when tab resurfaces.
        // Defined here so the timer owns its own visibility logic.
        this._onVisibilityChange = () => {
            if (!document.hidden && this.isActive) {
                // Re-derive remaining from timestamp; may immediately complete
                // if the timer expired while the tab was hidden.
                this._tick();
            }
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.recover();
    }

    // ─── Settings ──────────────────────────────────────────────────────────
    loadSettings() {
        const saved = Storage.get('flow_settings');
        if (saved) {
            const focus = parseInt(saved.focus, 10);
            const short = parseInt(saved.short, 10);
            const long  = parseInt(saved.long,  10);
            if (!isNaN(focus) && focus > 0) this.modes.focus.time = focus * 60;
            if (!isNaN(short) && short > 0) this.modes.short.time = short * 60;
            if (!isNaN(long)  && long  > 0) this.modes.long.time  = long  * 60;
        }
    }

    // ─── Core Controls ─────────────────────────────────────────────────────
    start() {
        if (this.isActive) return;

        // Set the absolute deadline from the current remaining time.
        // On first start timeLeft equals the full duration; on resume it
        // is the time that was left at the moment of pause.
        this.endTime     = Date.now() + this.timeLeft * 1000;
        this.isActive    = true;
        this.isCompleted = false;
        this.pausedAt    = null;

        this._persist();
        this._startDrivers();
    }

    pause() {
        if (!this.isActive) return;

        // Snapshot remaining time at the moment of pause so resume is accurate.
        this.timeLeft = Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
        this.pausedAt = Date.now();
        this.isActive = false;

        this._stopDrivers();
        Storage.set(this.storageKey, {
            status:    'paused',
            timeLeft:  this.timeLeft,
            mode:      this.currentMode,
            totalTime: this.totalTime
        });
        this.onTick(this.timeLeft, this.totalTime, false);
    }

    reset() {
        this.isActive    = false;
        this.isCompleted = false;
        this.endTime     = null;
        this.pausedAt    = null;
        this._stopDrivers();
        Storage.remove(this.storageKey);

        this.timeLeft  = this.modes[this.currentMode].time;
        this.totalTime = this.modes[this.currentMode].time;
        this.onTick(this.timeLeft, this.totalTime, false);
    }

    switchMode(mode) {
        this.currentMode = mode;
        this.reset();
    }

    /**
     * complete() — called by _tick() when remaining hits 0, or by the skip
     * button. Guarded against duplicate calls with this.isCompleted.
     */
    complete() {
        if (this.isCompleted) return;   // idempotency guard
        this.isCompleted = true;
        this.isActive    = false;

        this._stopDrivers();
        Storage.remove(this.storageKey);

        this.onComplete(this.currentMode, this.modes[this.currentMode].time);
    }

    // ─── Internal Drivers ──────────────────────────────────────────────────

    _startDrivers() {
        // rAF: smooth updates when visible
        this._scheduleRaf();

        // Interval: background heartbeat so the timer fires even when rAF is
        // throttled/halted by the browser in hidden tabs.
        if (!this.intervalId) {
            this.intervalId = setInterval(() => {
                if (this.isActive) this._tick();
            }, 1000);
        }
    }

    _stopDrivers() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    _scheduleRaf() {
        if (!this.isActive) return;
        this.rafId = requestAnimationFrame(() => this._tick());
    }

    // ─── Tick ───────────────────────────────────────────────────────────────
    _tick() {
        if (!this.isActive || this.isCompleted) return;

        const remaining = Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
        this.timeLeft   = remaining;
        this.onTick(this.timeLeft, this.totalTime, true);

        if (remaining <= 0) {
            this.complete();
            return;
        }

        // Only schedule the next rAF frame; the interval runs independently.
        this._scheduleRaf();
    }

    // ─── Persistence ────────────────────────────────────────────────────────
    _persist() {
        Storage.set(this.storageKey, {
            status:    'running',
            endTime:   this.endTime,
            mode:      this.currentMode,
            totalTime: this.totalTime
        });
    }

    // ─── Recovery after page reload ─────────────────────────────────────────
    recover() {
        const saved = Storage.get(this.storageKey);
        if (!saved) return;

        // 1. If timer was paused when page was closed/reloaded, restore paused state
        if (saved.status === 'paused') {
            this.currentMode = saved.mode      || 'focus';
            this.totalTime   = saved.totalTime || this.modes[this.currentMode].time;
            this.timeLeft    = (typeof saved.timeLeft === 'number') ? saved.timeLeft : this.totalTime;
            this.isActive    = false;
            this.isCompleted = false;
            this.onTick(this.timeLeft, this.totalTime, false);
            return;
        }

        // 2. If timer was running, compute remaining time from absolute endTime
        if (!saved.endTime) {
            Storage.remove(this.storageKey);
            return;
        }

        const remaining = Math.ceil((saved.endTime - Date.now()) / 1000);

        if (remaining > 0) {
            // Session was in progress — restore and resume automatically.
            this.currentMode = saved.mode      || 'focus';
            this.totalTime   = saved.totalTime || this.modes[this.currentMode].time;
            this.timeLeft    = remaining;
            this.endTime     = saved.endTime;
            this.isActive    = true;
            this.isCompleted = false;

            this.onTick(this.timeLeft, this.totalTime, true);
            this._startDrivers();
        } else if (remaining <= 0) {
            // Session expired while page was closed/reloaded.
            this.currentMode = saved.mode      || 'focus';
            this.totalTime   = saved.totalTime || this.modes[this.currentMode].time;
            Storage.remove(this.storageKey);
            this.timeLeft    = 0;
            this.isCompleted = true;

            // If it completed recently (within last 10 minutes), complete session gracefully.
            // Defer slightly so caller App constructor finishes initializing.
            if (Math.abs(remaining) < 600) {
                setTimeout(() => {
                    this.onComplete(this.currentMode, this.totalTime);
                }, 100);
            } else {
                // Stale session (e.g. days ago) — reset to default state
                this.timeLeft  = this.modes[this.currentMode].time;
                this.totalTime = this.modes[this.currentMode].time;
                this.onTick(this.timeLeft, this.totalTime, false);
            }
        }
    }
}
