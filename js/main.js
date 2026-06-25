import { TimerEngine } from './timer.js';
import { TaskManager }  from './tasks.js';
import { UI }           from './ui.js';
import { registerSW }   from './utils.js';
import { Storage }      from './storage.js';

// ─── Streak Calculator ───────────────────────────────────────────────────────
function calcStreaks(history) {
    const dates = [...new Set(
        history.filter(s => s.type === 'focus').map(s => s.date)
    )].sort().reverse();

    if (!dates.length) return { current: 0, best: 0 };

    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let current = 0;
    if (dates[0] === today || dates[0] === yesterday) {
        current = 1;
        let prev = new Date(dates[0]);
        for (let i = 1; i < dates.length; i++) {
            const cur  = new Date(dates[i]);
            const diff = Math.round((prev - cur) / 86400000);
            if (diff === 1) { current++; prev = cur; }
            else break;
        }
    }

    let best = 1, run = 1;
    for (let i = 1; i < dates.length; i++) {
        const diff = Math.round(
            (new Date(dates[i-1]) - new Date(dates[i])) / 86400000
        );
        run = diff === 1 ? run + 1 : 1;
        if (run > best) best = run;
    }

    return { current, best: Math.max(best, current) };
}

// ─── App Class ───────────────────────────────────────────────────────────────
class App {
    constructor() {
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
        const settings = Storage.get('flow_settings', {});
        this.timer.loadSettings();
        UI.loadSettingsValues(this.timer.modes, this.dailyGoal);
        UI.switchModeStyle(this.timer.currentMode);
        UI.renderTasks(this.tasks.getTasks(), id => this._toggleTask(id));
        UI.renderStats(this.history, this.streakData, this.dailyGoal);

        // Restore ambient audio preference
        if (this.currentAudio) UI.setAmbientAudio(this.currentAudio);
    }

    // ─── Session Complete ─────────────────────────────────────────────────
    onSessionComplete(mode, duration) {
        UI.playAlarm();

        if (mode === 'focus') {
            const session = {
                id:       Date.now(),
                date:     new Date().toISOString().split('T')[0],
                type:     mode,
                duration: duration
            };
            this.history.push(session);
            Storage.set('flow_history', this.history);
            this.streakData = calcStreaks(this.history);
            UI.renderStats(this.history, this.streakData, this.dailyGoal);

            // Check daily goal
            const today      = session.date;
            const todayCount = this.history.filter(s => s.type === 'focus' && s.date === today).length;
            if (todayCount === this.dailyGoal) {
                UI.showToast(`🎉 Daily goal of ${this.dailyGoal} sessions reached!`);
            }

            // GA4
            this._track('timer_complete', { mode, duration });
            if (todayCount === this.dailyGoal) this._track('goal_reached', {});
        }

        // Determine next mode
        const focusToday = this.history.filter(s =>
            s.type === 'focus' && s.date === new Date().toISOString().split('T')[0]
        ).length;

        const nextMode = mode !== 'focus' ? 'focus'
                       : focusToday % 4 === 0 ? 'long' : 'short';

        setTimeout(() => {
            this.timer.switchMode(nextMode);
            UI.switchModeStyle(nextMode);
            this.timer.start();
            UI.showToast(`Starting ${nextMode === 'focus' ? 'focus' : nextMode + ' break'}…`);

            if (Notification.permission === 'granted') {
                new Notification('FlowPomodoro', {
                    body: `Time for ${nextMode === 'focus' ? 'a focus session' : 'a break'}!`,
                    icon: '/assets/icon-192.png',
                });
            }
        }, 1500);
    }

    // ─── Task Helpers ──────────────────────────────────────────────────────
    _toggleTask(id) {
        this.tasks.toggleTask(id);
        UI.renderTasks(this.tasks.getTasks(), id2 => this._toggleTask(id2));
    }

    _addTask(text) {
        if (!text.trim()) return;
        this.tasks.addTask(text.trim());
        UI.renderTasks(this.tasks.getTasks(), id => this._toggleTask(id));
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

        // ── Visibility resume ──
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.timer.isActive) {
                // Recalc because RAF was paused by browser
                this.timer._tick();
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
document.addEventListener('DOMContentLoaded', () => {
    window.FlowApp = new App();

    // Request notification permission once
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
