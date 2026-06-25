import { formatTime } from './utils.js';

// ─── DOM Cache ────────────────────────────────────────────────────────────────
class UIController {
    constructor() {
        this.dom = this._queryDom();
        this._activeAudioKey = null;
    }

    _queryDom() {
        return {
            // Timer
            timeDisplay:   document.getElementById('time-display'),
            statusDisplay: document.getElementById('status-display'),
            streakDisplay: document.getElementById('streak-display'),
            ringProgress:  document.querySelector('.ring-progress'),
            toggleBtn:     document.getElementById('toggle-btn'),
            toggleIcon:    document.getElementById('toggle-icon'),
            resetBtn:      document.getElementById('reset-btn'),
            skipBtn:       document.getElementById('skip-btn'),
            modeTabs:      document.querySelectorAll('.tab-btn'),
            timerControls: document.querySelector('.timer-controls'),
            appSection:    document.getElementById('app-section'),

            // Tasks
            tasksList:     document.getElementById('tasks-list'),
            taskInput:     document.getElementById('task-input'),
            taskSubmit:    document.getElementById('task-submit'),

            // Audio
            alarmAudio:    document.getElementById('alarm-sound'),
            audioBtns:     document.querySelectorAll('.audio-btn'),
            ambientAudios: {
                rain:   document.getElementById('audio-rain'),
                forest: document.getElementById('audio-forest'),
                coffee: document.getElementById('audio-coffee'),
                noise:  document.getElementById('audio-noise'),
            },

            // Modals
            settingsModal: document.getElementById('settings-modal'),
            statsModal:    document.getElementById('stats-modal'),
            audioModal:    document.getElementById('audio-modal'),
            closeModalBtns: document.querySelectorAll('.close-modal-btn'),

            // Header buttons
            openSettingsBtn: document.getElementById('open-settings-btn'),
            openStatsBtn:    document.getElementById('open-stats-btn'),
            openAudioBtn:    document.getElementById('open-audio-btn'),
            fullscreenBtn:   document.getElementById('fullscreen-btn'),

            // Settings inputs
            inputFocus: document.getElementById('setting-focus'),
            inputShort: document.getElementById('setting-short'),
            inputLong:  document.getElementById('setting-long'),
            inputGoal:  document.getElementById('setting-goal'),
            presetBtns: document.querySelectorAll('.preset-btn'),
            saveSettingsBtn: document.getElementById('save-settings-btn'),

            // Stats
            statSessions:  document.getElementById('stat-sessions'),
            statHours:     document.getElementById('stat-hours'),
            statBest:      document.getElementById('stat-best'),
            dailyGoalText: document.getElementById('daily-goal-text'),
            progressFill:  document.getElementById('daily-goal-fill'),
            streakText:    document.getElementById('streak-text'),
            heatmapGrid:   document.getElementById('heatmap-grid'),
        };
    }

    // ─── Timer Display ────────────────────────────────────────────────────
    updateTimerDisplay(timeLeft, totalTime, isActive) {
        if (!this.dom.timeDisplay) return;

        this.dom.timeDisplay.textContent = formatTime(timeLeft);
        this.dom.toggleIcon.className    = `fas fa-${isActive ? 'pause' : 'play'}`;

        // Pulse on app section, not individual element (fixes parentElement bug)
        if (this.dom.appSection) {
            this.dom.appSection.classList.toggle('is-running', isActive);
        }

        // Progress ring — circumference ≈ 2π × 160 ≈ 1005.3
        if (this.dom.ringProgress && totalTime > 0) {
            const pct    = timeLeft / totalTime;
            const offset = 1006 * (1 - pct);
            this.dom.ringProgress.style.strokeDashoffset = offset;
        }

        // Browser tab title
        document.title = isActive
            ? `${formatTime(timeLeft)} — FlowPomodoro`
            : 'FlowPomodoro | Free Focus Timer';
    }

    // ─── Mode Tabs ────────────────────────────────────────────────────────
    switchModeStyle(mode) {
        document.body.setAttribute('data-mode', mode);

        this.dom.modeTabs.forEach(t => {
            const isActive = t.dataset.mode === mode;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive.toString());
        });

        const labels = {
            focus: 'Ready to Focus',
            short: 'Take a Break',
            long:  'Deep Rest',
        };
        if (this.dom.statusDisplay) {
            this.dom.statusDisplay.textContent = labels[mode] || '';
        }
    }

    // ─── Tasks ────────────────────────────────────────────────────────────
    renderTasks(tasks, onToggle) {
        const list = this.dom.tasksList;
        if (!list) return;
        list.innerHTML = '';

        if (!tasks.length) {
            list.innerHTML = '<p class="task-empty">Add a task to stay focused.</p>';
            return;
        }

        tasks.forEach(t => {
            const item = document.createElement('div');
            item.className = `task-item${t.completed ? ' done' : ''}`;
            item.setAttribute('role', 'listitem');

            const check = document.createElement('div');
            check.className = `task-check${t.completed ? ' completed' : ''}`;
            check.innerHTML = t.completed ? '<i class="fas fa-check" aria-hidden="true"></i>' : '';

            const text = document.createElement('span');
            text.className = 'task-text';
            text.textContent = t.text; // Sanitized via textContent

            item.appendChild(check);
            item.appendChild(text);
            item.addEventListener('click', () => onToggle(t.id));
            list.appendChild(item);
        });
    }

    // ─── Modals ────────────────────────────────────────────────────────────
    openModal(el)  { if (el) el.classList.remove('hidden'); }
    closeModal(el) { if (el) el.classList.add('hidden'); }

    // ─── Settings ─────────────────────────────────────────────────────────
    loadSettingsValues(modes, goal) {
        if (this.dom.inputFocus) this.dom.inputFocus.value = modes.focus.time / 60;
        if (this.dom.inputShort) this.dom.inputShort.value = modes.short.time / 60;
        if (this.dom.inputLong)  this.dom.inputLong.value  = modes.long.time  / 60;
        if (this.dom.inputGoal)  this.dom.inputGoal.value  = goal || 4;
    }

    // ─── Stats ────────────────────────────────────────────────────────────
    renderStats(history, streakData, dailyGoal) {
        const focus = history.filter(s => s.type === 'focus');
        const count = focus.length;
        const hours = (focus.reduce((a, s) => a + s.duration, 0) / 3600).toFixed(1);
        const today = new Date().toISOString().split('T')[0];
        const todayCount = focus.filter(s => s.date === today).length;

        if (this.dom.statSessions) this.dom.statSessions.textContent = count;
        if (this.dom.statHours)    this.dom.statHours.textContent    = hours;
        if (this.dom.statBest)     this.dom.statBest.textContent     = streakData.best;

        const pct = Math.min(100, dailyGoal > 0 ? (todayCount / dailyGoal) * 100 : 0);
        if (this.dom.dailyGoalText) this.dom.dailyGoalText.textContent = `${todayCount} / ${dailyGoal} sessions today`;
        if (this.dom.progressFill)  this.dom.progressFill.style.width  = `${pct}%`;
        if (this.dom.streakText)    this.dom.streakText.textContent     = `${streakData.current} day streak 🔥`;
        if (this.dom.streakDisplay) {
            this.dom.streakDisplay.textContent = streakData.current > 0
                ? `${streakData.current} day streak 🔥`
                : '';
        }

        this._renderHeatmap(history);
    }

    _renderHeatmap(history) {
        const grid = this.dom.heatmapGrid;
        if (!grid) return;
        grid.innerHTML = '';

        const freq = {};
        history.filter(s => s.type === 'focus').forEach(s => {
            freq[s.date] = (freq[s.date] || 0) + 1;
        });

        for (let i = 59; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const n   = freq[key] || 0;
            const cell = document.createElement('div');
            cell.className = 'day-cell' + (n >= 8 ? ' l3' : n >= 4 ? ' l2' : n > 0 ? ' l1' : '');
            cell.title = `${key}: ${n} session${n !== 1 ? 's' : ''}`;
            grid.appendChild(cell);
        }
    }

    // ─── Fullscreen ────────────────────────────────────────────────────────
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }

        const icon = this.dom.fullscreenBtn?.querySelector('i');
        if (icon) {
            icon.className = document.fullscreenElement
                ? 'fas fa-compress'
                : 'fas fa-expand';
        }
    }

    // ─── Ambient Audio ─────────────────────────────────────────────────────
    setAmbientAudio(key) {
        // Stop all
        Object.values(this.dom.ambientAudios).forEach(el => {
            if (el) { el.pause(); el.currentTime = 0; }
        });
        this.dom.audioBtns.forEach(b => b.classList.remove('active'));
        this._activeAudioKey = null;

        if (key && this.dom.ambientAudios[key]) {
            this.dom.ambientAudios[key].play().catch(() => {});
            this._activeAudioKey = key;
            const btn = document.querySelector(`.audio-btn[data-audio="${key}"]`);
            if (btn) btn.classList.add('active');
        }
    }

    // ─── Alarm ─────────────────────────────────────────────────────────────
    playAlarm() {
        const a = this.dom.alarmAudio;
        if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    }

    // ─── Toast ─────────────────────────────────────────────────────────────
    showToast(msg, duration = 2500) {
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            toast.className = 'toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
    }
}

export const UI = new UIController();
