import { formatTime } from './utils.js';

// ─── DOM Cache ────────────────────────────────────────────────────────────────
class UIController {
    constructor() {
        this.dom = this._queryDom();
        this._activeAudioKey = null;
        this.initTheme();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('flow_theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            // Default to dark mode for the app
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        this._updateThemeIcon();
        
        if (this.dom.themeToggleBtn) {
            this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }
    }

    toggleTheme() {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('flow_theme', newTheme);
        this._updateThemeIcon();
    }

    _updateThemeIcon() {
        if (!this.dom.themeToggleBtn) return;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.dom.themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-moon" aria-hidden="true"></i>' : '<i class="fas fa-sun" aria-hidden="true"></i>';
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

            // Theme toggle
            themeToggleBtn: document.getElementById('theme-toggle-btn'),

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

    refreshDom() {
        this.dom = this._queryDom();
    }

    // ─── Timer Display ────────────────────────────────────────────────────
    updateTimerDisplay(timeLeft, totalTime, isActive) {
        if (!this.dom.timeDisplay) {
            this.dom.timeDisplay = document.getElementById('time-display');
        }
        if (!this.dom.timeDisplay) return;

        this.dom.timeDisplay.textContent = formatTime(timeLeft);
        if (this.dom.toggleIcon) {
            this.dom.toggleIcon.className = `fas fa-${isActive ? 'pause' : 'play'}`;
        }

        // Pulse on app section, not individual element (fixes parentElement bug)
        if (this.dom.appSection) {
            this.dom.appSection.classList.toggle('is-running', isActive);
        }

        // Progress ring — circumference ≈ 2π × 160 ≈ 1005.3
        if (!this.dom.ringProgress) {
            this.dom.ringProgress = document.querySelector('.ring-progress');
        }
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
    /**
     * Render the task list.
     * @param {Array}    tasks    - Array of task objects
     * @param {Function} onToggle - Called with (id) to toggle completion
     * @param {Function} onDelete - Called with (id) to permanently delete
     */
    renderTasks(tasks, onToggle, onDelete) {
        const list = this.dom.tasksList;
        if (!list) return;

        // Replace list with new DOM — no orphaned listeners (old elements are GC'd)
        list.innerHTML = '';

        if (!tasks.length) {
            const empty = document.createElement('div');
            empty.className = 'task-empty';
            empty.setAttribute('aria-label', 'No tasks yet');
            empty.innerHTML = `
                <i class="fas fa-layer-group" aria-hidden="true"></i>
                <span>No tasks yet</span>
                <small>Add one below to stay focused</small>
            `;
            list.appendChild(empty);
            return;
        }

        tasks.forEach(t => {
            const item = document.createElement('div');
            item.className = `task-item${t.completed ? ' done' : ''}`;
            item.setAttribute('role', 'listitem');
            item.dataset.taskId = t.id;
            // Tabindex so keyboard users can focus the row
            item.setAttribute('tabindex', '0');
            item.setAttribute('aria-label',
                `${t.text} — ${t.completed ? 'completed' : 'pending'}. Press Enter to toggle, Delete to remove.`
            );

            // ── Checkbox ──────────────────────────────────────────────
            const check = document.createElement('button');
            check.className   = `task-check${t.completed ? ' completed' : ''}`;
            check.type        = 'button';
            check.tabIndex    = -1; // row handles focus; checkbox is click target only
            check.setAttribute('aria-label', t.completed ? 'Mark as pending' : 'Mark as complete');
            if (t.completed) {
                check.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
            }

            // ── Text ─────────────────────────────────────────────────
            const text = document.createElement('span');
            text.className   = 'task-text';
            text.textContent = t.text; // textContent prevents XSS

            // ── Delete button ─────────────────────────────────────────
            const deleteBtn = document.createElement('button');
            deleteBtn.className  = 'task-delete-btn';
            deleteBtn.type       = 'button';
            deleteBtn.tabIndex   = -1; // row handles keyboard focus
            deleteBtn.setAttribute('aria-label', `Delete task: ${t.text}`);
            deleteBtn.setAttribute('title', 'Delete task');
            deleteBtn.innerHTML  = '<i class="fas fa-trash-can" aria-hidden="true"></i>';

            item.appendChild(check);
            item.appendChild(text);
            item.appendChild(deleteBtn);

            // ── Interactions ──────────────────────────────────────────

            // Toggle on checkbox click (don't bubble to row)
            check.addEventListener('click', e => {
                e.stopPropagation();
                onToggle(t.id);
            });

            // Toggle on row click (not if clicking delete)
            item.addEventListener('click', e => {
                if (e.target.closest('.task-delete-btn')) return;
                onToggle(t.id);
            });

            // Keyboard: Enter = toggle, Delete/Backspace = delete
            item.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle(t.id);
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    this._confirmAndDelete(item, t, onDelete);
                }
            });

            // Delete button click → confirm flow
            deleteBtn.addEventListener('click', e => {
                e.stopPropagation();
                this._confirmAndDelete(item, t, onDelete);
            });

            list.appendChild(item);
        });
    }

    /**
     * Inline delete confirmation — replaces the delete button with Yes/No.
     * No modal, no browser confirm() — stays within the task row.
     */
    _confirmAndDelete(item, task, onDelete) {
        // Prevent duplicate confirm state
        if (item.classList.contains('confirming')) return;
        item.classList.add('confirming');

        const deleteBtn = item.querySelector('.task-delete-btn');
        const check     = item.querySelector('.task-check');

        // Swap delete btn for confirm controls
        const original = deleteBtn.innerHTML;

        const confirmWrap = document.createElement('div');
        confirmWrap.className = 'task-confirm-wrap';
        confirmWrap.setAttribute('role', 'group');
        confirmWrap.setAttribute('aria-label', 'Confirm delete');

        const yesBtn = document.createElement('button');
        yesBtn.type        = 'button';
        yesBtn.className   = 'task-confirm-yes';
        yesBtn.textContent = 'Delete';
        yesBtn.setAttribute('aria-label', `Confirm delete: ${task.text}`);

        const noBtn = document.createElement('button');
        noBtn.type        = 'button';
        noBtn.className   = 'task-confirm-no';
        noBtn.textContent = 'Keep';
        noBtn.setAttribute('aria-label', 'Cancel delete');

        confirmWrap.appendChild(yesBtn);
        confirmWrap.appendChild(noBtn);

        deleteBtn.replaceWith(confirmWrap);

        // Focus yes button for keyboard users
        requestAnimationFrame(() => yesBtn.focus());

        const cancel = () => {
            item.classList.remove('confirming');
            confirmWrap.replaceWith(deleteBtn);
        };

        // Confirmed — animate out then delete
        yesBtn.addEventListener('click', e => {
            e.stopPropagation();
            this._animateRemove(item, () => onDelete(task.id));
        });

        noBtn.addEventListener('click', e => {
            e.stopPropagation();
            cancel();
        });

        // Cancel on Escape
        const escHandler = e => {
            if (e.key === 'Escape') {
                cancel();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Cancel if user clicks outside the item
        const outsideHandler = e => {
            if (!item.contains(e.target)) {
                cancel();
                document.removeEventListener('click', outsideHandler, true);
                document.removeEventListener('keydown', escHandler);
            }
        };
        // Use capture so we get the event before it might be stopped
        setTimeout(() => {
            document.addEventListener('click', outsideHandler, true);
        }, 0);
    }

    /**
     * Smooth fade + slide-left exit animation, then calls done().
     */
    _animateRemove(item, done) {
        item.classList.add('task-removing');
        // Wait for CSS transition to finish
        const finish = () => {
            item.removeEventListener('transitionend', finish);
            done();
        };
        item.addEventListener('transitionend', finish);
        // Safety fallback in case transitionend doesn't fire
        setTimeout(finish, 420);
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
