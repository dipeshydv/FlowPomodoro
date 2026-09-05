import { TimerEngine } from './timer.js';
import { TaskManager }  from './tasks.js';
import { UI }           from './ui.js';
import { registerSW }   from './utils.js';
import { Storage }      from './storage.js';
import { GoalStore, SessionStore, getLocalDateKey } from './platform/store.js';

// ─── Streak Calculator ───────────────────────────────────────────────────────
function calcStreaks(history) {
    const dates = [...new Set(
        history.filter(s => s.type === 'focus').map(s => s.date)
    )].sort().reverse();

    if (!dates.length) return { current: 0, best: 0 };

    const todayDate = getLocalDateKey();
    const yesterdayDateObj = new Date();
    yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);
    const yesterday = getLocalDateKey(yesterdayDateObj);

    let current = 0;
    if (dates[0] === todayDate || dates[0] === yesterday) {
        current = 1;
        let prev = new Date(dates[0] + 'T00:00:00');
        for (let i = 1; i < dates.length; i++) {
            const cur  = new Date(dates[i] + 'T00:00:00');
            const diff = Math.round((prev - cur) / 86400000);
            if (diff === 1) { current++; prev = cur; }
            else break;
        }
    }

    let best = 1, run = 1;
    for (let i = 1; i < dates.length; i++) {
        const cur = new Date(dates[i] + 'T00:00:00');
        const prev = new Date(dates[i-1] + 'T00:00:00');
        const diff = Math.round((prev - cur) / 86400000);
        run = diff === 1 ? run + 1 : 1;
        if (run > best) best = run;
    }

    return { current, best: Math.max(best, current) };
}

// ─── App Class ───────────────────────────────────────────────────────────────
class App {
    constructor() {
        UI.refreshDom();

        const settings   = Storage.get('flow_settings', {});
        this.dailyGoal   = settings.goal || 4;
        this.isPremium   = Storage.get('flow_premium', false);

        this.tasks       = new TaskManager();
        this.history     = Storage.get('flow_history', []);
        this.streakData  = calcStreaks(this.history);
        this.currentAudio = Storage.get('flow_audio', null);

        this.timer = new TimerEngine(
            (timeLeft, total, isActive) => UI.updateTimerDisplay(timeLeft, total, isActive),
            (mode, duration)            => this.onSessionComplete(mode, duration)
        );

        this.bindEvents();
        this.init();
    }

    // ─── Init ────────────────────────────────────────────────────────────
    init() {
    registerSW();

    UI.updateTimerDisplay(
        this.timer.timeLeft,
        this.timer.totalTime,
        this.timer.isActive
    );

    UI.loadSettingsValues(this.timer.modes, this.dailyGoal);
    UI.switchModeStyle(this.timer.currentMode);

    UI.renderTasks(
        this.tasks.getTasks(),
        id => this._toggleTask(id),
        id => this._deleteTask(id)
    );

    UI.renderStats(
        this.history,
        this.streakData,
        this.dailyGoal
    );

    if (this.currentAudio) {
        UI.setAmbientAudio(this.currentAudio);
    }
}

    // ─── Session Complete ─────────────────────────────────────────────────
    onSessionComplete(mode, duration) {
        UI.playAlarm();

        // Fire the completion notification immediately when the session ends —
        // this is the reliable signal for users in other tabs/minimized windows.
        this._sendCompletionNotification(mode);

        if (mode === 'focus') {
            const selEl = (typeof document !== 'undefined') ? document.getElementById('goal-selector') : null;
            let activeGoalId = (selEl && selEl.value) ? selEl.value : (localStorage.getItem('flow_active_goal') || sessionStorage.getItem('flow_active_goal') || null);
            let activeGoal = activeGoalId ? GoalStore.get(activeGoalId) : null;

            // If activeGoalId is not set, check if there is an active goal
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

            const durationSecs = Number(duration) || 1500;
            const durationMins = Math.round(durationSecs / 60);

            const rawSession = {
                id:              Date.now(),
                date:            getLocalDateKey(),
                type:            mode,
                duration:        durationSecs,
                durationMinutes: durationMins,
                goalId:          activeGoal ? String(activeGoal.id) : (activeGoalId ? String(activeGoalId) : null),
                goalName:        activeGoal ? activeGoal.name : null,
                completedAt:     new Date().toISOString()
            };

            const session = SessionStore.normalizeSession(rawSession) || rawSession;

            console.log("[FlowPomodoro] COMPLETED SESSION", {
                session,
                goalId: session.goalId,
                goalName: session.goalName,
                duration: session.duration,
                durationMinutes: session.durationMinutes,
                completedAt: session.completedAt,
                date: session.date
            });

            this.history.push(session);
            Storage.set('flow_history', this.history);
            this.streakData = calcStreaks(this.history);
            UI.renderStats(this.history, this.streakData, this.dailyGoal);

            // Dispatch global event for reactive components across tabs/pages
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('flow:session-completed', { detail: session }));
                window.dispatchEvent(new CustomEvent('flow:storage-updated', { detail: { key: 'flow_history' } }));
            }

            // Check daily goal
            const todayDate  = session.date;
            const todayCount = this.history.filter(s => s.type === 'focus' && s.date === todayDate).length;
            if (todayCount === this.dailyGoal) {
                UI.showToast(`🎉 Daily goal of ${this.dailyGoal} sessions reached!`);
            }

            // GA4
            this._track('timer_complete', { mode, duration: durationSecs, durationMinutes: durationMins });
            if (todayCount === this.dailyGoal) this._track('goal_reached', {});
        }

        // Determine next mode
        const todayDate = getLocalDateKey();
        const focusToday = this.history.filter(s =>
            s.type === 'focus' && s.date === todayDate
        ).length;

        const nextMode = mode !== 'focus' ? 'focus'
                       : focusToday % 4 === 0 ? 'long' : 'short';

        setTimeout(() => {
            this.timer.switchMode(nextMode);
            UI.switchModeStyle(nextMode);
            this.timer.start();
            UI.showToast(`Starting ${nextMode === 'focus' ? 'focus' : nextMode + ' break'}…`);
        }, 1500);
    }

    // ─── Task Helpers ──────────────────────────────────────────────────────
    _toggleTask(id) {
        this.tasks.toggleTask(id);
        UI.renderTasks(
            this.tasks.getTasks(),
            id2 => this._toggleTask(id2),
            id2 => this._deleteTask(id2)
        );
    }

    // ─── Completion Notification ───────────────────────────────────────────
    /**
     * Sends a Web Notification when a Pomodoro or break session ends.
     * This is the primary alert mechanism for users in background tabs.
     *
     * Audio (UI.playAlarm) handles the in-tab signal; notifications handle
     * the background signal. The two work together — audio may be blocked by
     * browser autoplay policies when the page is hidden.
     */
    _sendCompletionNotification(mode) {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;

        const isFocus = mode === 'focus';
        const title   = isFocus ? '✅ Focus session complete' : '☕ Break complete';
        const body    = isFocus
            ? 'Your Pomodoro is done. Time for a break!'
            : 'Break is over. Ready for your next focus session?';

        const options = {
            body,
            icon: '/icons/icon-192.png',
            badge: '/assets/favicon.svg',
            tag: 'flow-session-complete',  // replaces any previous unread notification
            renotify: true,
            silent: false,
        };

        // Prefer ServiceWorkerRegistration.showNotification if available (standard for PWAs and mobile)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                return registration.showNotification(title, options);
            }).catch(() => {
                this._fallbackWindowNotification(title, options);
            });
        } else {
            this._fallbackWindowNotification(title, options);
        }
    }

    _fallbackWindowNotification(title, options) {
        try {
            const n = new Notification(title, options);
            setTimeout(() => n.close(), 8000);
        } catch (_) {
            // Non-fatal if browser blocks or throws constructor error
        }
    }

    _addTask(text) {
        if (!text.trim()) return;
        this.tasks.addTask(text.trim());
        UI.renderTasks(
            this.tasks.getTasks(),
            id => this._toggleTask(id),
            id => this._deleteTask(id)
        );
    }

    _deleteTask(id) {
        const deleted = this.tasks.deleteTask(id);
        if (!deleted) return;
        // Re-render list (stats panel, if open, reflects new counts too)
        UI.renderTasks(
            this.tasks.getTasks(),
            id2 => this._toggleTask(id2),
            id2 => this._deleteTask(id2)
        );
        // Re-render session stats so completed/pending counts stay accurate
        UI.renderStats(this.history, this.streakData, this.dailyGoal);
    }

    // ─── Event Binding ────────────────────────────────────────────────────
    bindEvents() {
        // Mode tabs
        UI.dom.modeTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                this.timer.switchMode(btn.dataset.mode);
                UI.switchModeStyle(btn.dataset.mode);
            });
        });

        // Play / Pause
        UI.dom.toggleBtn?.addEventListener('click', () => {
            if (this.timer.isActive) {
                this.timer.pause();
            } else {
                // Request notification permission on explicit user interaction
                if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
                this.timer.start();
                this._track('timer_start', { mode: this.timer.currentMode });
            }
            UI.updateTimerDisplay(this.timer.timeLeft, this.timer.totalTime, this.timer.isActive);
        });

        // Reset
        UI.dom.resetBtn?.addEventListener('click', () => {
            this.timer.reset();
            UI.updateTimerDisplay(this.timer.timeLeft, this.timer.totalTime, false);
        });

        // Skip
        UI.dom.skipBtn?.addEventListener('click', () => this.timer.complete());

        // ── Tasks ──
        // Inline input: Enter key
        UI.dom.taskInput?.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                this._addTask(UI.dom.taskInput.value);
                UI.dom.taskInput.value = '';
            }
        });
        // Inline input: submit button
        UI.dom.taskSubmit?.addEventListener('click', () => {
            this._addTask(UI.dom.taskInput?.value || '');
            if (UI.dom.taskInput) UI.dom.taskInput.value = '';
        });

        // ── Modals ──
        UI.dom.openSettingsBtn?.addEventListener('click', () => {
            UI.loadSettingsValues(this.timer.modes, this.dailyGoal);
            UI.openModal(UI.dom.settingsModal);
        });

        UI.dom.openStatsBtn?.addEventListener('click', () => {
            UI.renderStats(this.history, this.streakData, this.dailyGoal);
            UI.openModal(UI.dom.statsModal);
        });

        UI.dom.openAudioBtn?.addEventListener('click', () => UI.openModal(UI.dom.audioModal));

        UI.dom.fullscreenBtn?.addEventListener('click', () => UI.toggleFullscreen());

        UI.dom.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', e => {
                const overlay = e.target.closest('.modal-overlay');
                if (overlay) UI.closeModal(overlay);
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', e => {
                if (e.target === overlay) UI.closeModal(overlay);
            });
        });

        // ── Settings save ──
        UI.dom.saveSettingsBtn?.addEventListener('click', () => {
            const settings = {
                focus: Math.max(1, parseInt(UI.dom.inputFocus?.value) || 25),
                short: Math.max(1, parseInt(UI.dom.inputShort?.value) || 5),
                long:  Math.max(1, parseInt(UI.dom.inputLong?.value)  || 15),
                goal:  Math.max(1, parseInt(UI.dom.inputGoal?.value)  || 4),
            };
            this.dailyGoal = settings.goal;
            Storage.set('flow_settings', settings);
            this.timer.loadSettings();
            this.timer.reset();
            UI.loadSettingsValues(this.timer.modes, this.dailyGoal);
            UI.updateTimerDisplay(this.timer.timeLeft, this.timer.totalTime, false);
            UI.renderStats(this.history, this.streakData, this.dailyGoal);
            UI.closeModal(UI.dom.settingsModal);
            UI.showToast('Settings saved ✓');
        });

        // ── Presets ──
        UI.dom.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const p = btn.dataset.preset;
                const map = { '25': [25, 5, 15], '50': [50, 10, 20], '90': [90, 20, 30] };
                const [f, s, l] = map[p] || [25, 5, 15];
                if (UI.dom.inputFocus) UI.dom.inputFocus.value = f;
                if (UI.dom.inputShort) UI.dom.inputShort.value = s;
                if (UI.dom.inputLong)  UI.dom.inputLong.value  = l;
            });
        });

        // ── Ambient Audio ──
        UI.dom.audioBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.audio;
                // Premium gate for coffee & noise
                if ((key === 'coffee' || key === 'noise') && !this.isPremium) {
                    UI.showToast('☕ Upgrade to Premium for more sounds!');
                    return;
                }
                this.currentAudio = (this.currentAudio === key) ? null : key;
                Storage.set('flow_audio', this.currentAudio);
                UI.setAmbientAudio(this.currentAudio);
            });
        });

        // ── Keyboard shortcuts ──
        document.addEventListener('keydown', e => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    UI.dom.toggleBtn?.click();
                    break;
                case 'KeyR':
                    UI.dom.resetBtn?.click();
                    break;
                case 'KeyS':
                    UI.dom.skipBtn?.click();
                    break;
                case 'KeyF':
                    UI.toggleFullscreen();
                    break;
                case 'Escape':
                    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => UI.closeModal(m));
                    break;
            }
        });

        // ── Fullscreen icon toggle ──
        document.addEventListener('fullscreenchange', () => {
            const icon = UI.dom.fullscreenBtn?.querySelector('i');
            if (icon) {
                icon.className = document.fullscreenElement
                    ? 'fas fa-compress'
                    : 'fas fa-expand';
            }
        });
    }

    // ─── Analytics ──────────────────────────────────────────────────────────
    _track(event, params) {
        if (typeof gtag === 'function') {
            gtag('event', event, { event_category: 'engagement', ...params });
        }
    }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
function initApp() {
    if (!window.FlowApp) {
        window.FlowApp = new App();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
