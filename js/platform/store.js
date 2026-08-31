/* ==========================================================================
   FLOWPOMODORO PLATFORM — Central Data Store
   All CRUD operations for Goals, TimeBlocks, Challenges, Reviews, Sessions
   ========================================================================== */

import { Storage } from '../storage.js';

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEYS = {
  goals:        'flow_goals',
  timeBlocks:   'flow_timeblocks',
  challenges:   'flow_challenges',
  dailyReview:  'flow_daily_reviews',
  weeklyReview: 'flow_weekly_reviews',
  sessions:     'flow_history',       // same key as main.js
  settings:     'flow_settings',
  onboarding:   'flow_onboarding',
  theme:        'flow_theme',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export function getLocalDateKey(date) {
  const d = date ? (typeof date === 'string' ? new Date(date.includes('T') ? date : date + 'T00:00:00') : new Date(date)) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function today() { return getLocalDateKey(); }

function weekStart(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0) ? -6 : 1 - day; // Monday
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return getLocalDateKey(mon);
}

// ─── Goals ───────────────────────────────────────────────────────────────────
export const GoalStore = {
  // Normalize and migrate existing goal data for backward compatibility
  _normalize(g) {
    if (!g) return null;
    const isHabit = g.type === 'habit' || (!g.type && (g.dailyTarget || g.recurrenceType));
    const rawSelectedDays = Array.isArray(g.selectedDays) ? g.selectedDays : null;
    const defaultDays = rawSelectedDays !== null ? rawSelectedDays : [0, 1, 2, 3, 4, 5, 6]; // all 7 days by default

    let recurrenceType = g.recurrenceType;
    if (!recurrenceType) {
      if (g.type === 'goal') {
        recurrenceType = 'none';
      } else {
        recurrenceType = defaultDays.length === 7 ? 'daily' : (defaultDays.length > 0 ? 'selected_days' : 'daily');
      }
    }

    const dailyTarget = parseInt(g.dailyTarget) || 60;
    const activeDaysCount = defaultDays.length > 0 ? defaultDays.length : 7;
    const weeklyTarget = parseInt(g.weeklyTarget) || (dailyTarget * activeDaysCount);

    return {
      id:             g.id || uid(),
      name:           g.name || 'Untitled Goal',
      icon:           g.icon || '🎯',
      category:       g.category || 'General',
      description:    g.description || '',
      type:           g.type || (isHabit ? 'habit' : 'goal'), // 'goal' (outcome) | 'habit' (recurring activity)
      recurrenceType: recurrenceType, // 'none' | 'daily' | 'weekdays' | 'weekends' | 'selected_days' | 'weekly' | 'biweekly' | 'monthly' | 'custom'
      selectedDays:   defaultDays, // [0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat]
      interval:       parseInt(g.interval) || 1,
      startDate:      g.startDate || '',
      endDate:        g.endDate || '',
      skippedDates:   Array.isArray(g.skippedDates) ? g.skippedDates : [],
      dailyTarget:    dailyTarget,
      weeklyTarget:   weeklyTarget,
      priority:       g.priority || 'medium',
      color:          g.color || '#FFB800',
      isActive:       g.isActive !== false,
      createdAt:      g.createdAt || new Date().toISOString(),
      updatedAt:      g.updatedAt || new Date().toISOString(),
    };
  },

  getAll() {
    const raw = Storage.get(KEYS.goals, []);
    return raw.map(g => this._normalize(g));
  },

  getActive() {
    return this.getAll().filter(g => g.isActive !== false);
  },

  getArchived() {
    return this.getAll().filter(g => g.isActive === false);
  },

  get(id) {
    if (!id) return null;
    const all = this.getAll();
    const strId = String(id).trim();
    return all.find(g => String(g.id) === strId) || null;
  },

  getById(id) {
    return this.get(id);
  },

  save(goalData) {
    const all = this.getAll();
    const now = new Date().toISOString();
    
    // Normalize input days and weekly target
    const type = goalData.type || 'habit';
    const recurrenceType = goalData.recurrenceType || (type === 'goal' ? 'none' : 'daily');
    let selectedDays = Array.isArray(goalData.selectedDays) ? goalData.selectedDays : [0, 1, 2, 3, 4, 5, 6];
    
    // Sync selectedDays with presets if standard recurrence is chosen
    if (recurrenceType === 'daily') selectedDays = [0, 1, 2, 3, 4, 5, 6];
    else if (recurrenceType === 'weekdays') selectedDays = [1, 2, 3, 4, 5];
    else if (recurrenceType === 'weekends') selectedDays = [0, 6];
    else if (recurrenceType === 'none') selectedDays = [];

    const dailyTarget = parseInt(goalData.dailyTarget) || 60;
    const weeklyTarget = parseInt(goalData.weeklyTarget) || this.calculateWeeklyTarget(dailyTarget, selectedDays);

    if (goalData.id) {
      // Update
      const strId = String(goalData.id).trim();
      const idx = all.findIndex(g => String(g.id).trim() === strId);
      if (idx !== -1) {
        const updated = this._normalize({
          ...all[idx],
          ...goalData,
          type,
          recurrenceType,
          selectedDays,
          dailyTarget,
          weeklyTarget,
          updatedAt: now
        });
        all[idx] = updated;
        Storage.set(KEYS.goals, all);
        return updated;
      }
    }

    // Create new
    const goal = this._normalize({
      id:             goalData.id || uid(),
      name:           goalData.name || 'Untitled Goal',
      icon:           goalData.icon || '🎯',
      category:       goalData.category || 'General',
      description:    goalData.description || '',
      type:           type,
      recurrenceType: recurrenceType,
      selectedDays:   selectedDays,
      interval:       parseInt(goalData.interval) || 1,
      startDate:      goalData.startDate || '',
      endDate:        goalData.endDate || '',
      skippedDates:   [],
      dailyTarget:    dailyTarget,
      weeklyTarget:   weeklyTarget,
      priority:       goalData.priority || 'medium',
      color:          goalData.color || '#FFB800',
      isActive:       true,
      createdAt:      now,
      updatedAt:      now,
    });

    all.push(goal);
    Storage.set(KEYS.goals, all);
    return goal;
  },

  archive(id) {
    const all = this.getAll();
    const idx = all.findIndex(g => g.id === id);
    if (idx !== -1) {
      all[idx].isActive = false;
      all[idx].updatedAt = new Date().toISOString();
      Storage.set(KEYS.goals, all);
    }
  },

  unarchive(id) {
    const all = this.getAll();
    const idx = all.findIndex(g => g.id === id);
    if (idx !== -1) {
      all[idx].isActive = true;
      all[idx].updatedAt = new Date().toISOString();
      Storage.set(KEYS.goals, all);
    }
  },

  delete(id) {
    const all = this.getAll().filter(g => g.id !== id);
    Storage.set(KEYS.goals, all);
  },

  // ─── Recurrence Logic ───────────────────────────────────────────────────────
  /**
   * Check if a goal is scheduled for a specific date (YYYY-MM-DD)
   */
  isScheduledForDate(goal, dateStr) {
    if (!goal || goal.isActive === false) return false;
    const dStr = dateStr || today();

    // Check date bounds
    if (goal.startDate && dStr < goal.startDate) return false;
    if (goal.endDate && dStr > goal.endDate) return false;

    // Check skip dates
    if (goal.skippedDates && goal.skippedDates.includes(dStr)) return false;

    // Check recurrence type
    const d = new Date(dStr + 'T00:00:00');
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    switch (goal.recurrenceType) {
      case 'none':
        // Outcome goal: not scheduled on a recurring daily track
        return false;
      case 'daily':
        return true;
      case 'weekdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      case 'weekends':
        return dayOfWeek === 0 || dayOfWeek === 6;
      case 'selected_days':
        return Array.isArray(goal.selectedDays) && goal.selectedDays.includes(dayOfWeek);
      case 'weekly':
        return Array.isArray(goal.selectedDays) && goal.selectedDays.length > 0
          ? goal.selectedDays.includes(dayOfWeek)
          : dayOfWeek === 1;
      case 'biweekly': {
        if (!Array.isArray(goal.selectedDays) || !goal.selectedDays.includes(dayOfWeek)) return false;
        if (!goal.startDate) return true;
        const start = new Date(goal.startDate + 'T00:00:00');
        const diffWeeks = Math.floor((d - start) / (7 * 86400000));
        return Math.abs(diffWeeks) % (goal.interval || 2) === 0;
      }
      case 'monthly': {
        const startDay = goal.startDate ? new Date(goal.startDate + 'T00:00:00').getDate() : 1;
        return d.getDate() === startDay;
      }
      case 'custom':
        return Array.isArray(goal.selectedDays) && goal.selectedDays.includes(dayOfWeek);
      default:
        return Array.isArray(goal.selectedDays) ? goal.selectedDays.includes(dayOfWeek) : true;
    }
  },

  /**
   * Check if a date is a Rest Day for a recurring Habit.
   * Outcome goals (type === 'goal') are never considered rest days.
   */
  isRestDay(goal, dateStr) {
    if (!goal || goal.isActive === false) return false;
    // Only habits get "Rest Day"
    if (goal.type !== 'habit') return false;
    if (goal.recurrenceType === 'none') return false;

    const dStr = dateStr || today();
    if (goal.startDate && dStr < goal.startDate) return false;
    if (goal.endDate && dStr > goal.endDate) return false;

    // If it is scheduled for today, it's not a rest day
    if (this.isScheduledForDate(goal, dStr)) return false;

    // If it was explicitly skipped for today, it's a skipped day, not regular rest day
    if (goal.skippedDates && goal.skippedDates.includes(dStr)) return false;

    // It is an active habit, but today is not one of its selected days
    return true;
  },

  /**
   * Check if an occurrence was skipped on a date
   */
  isSkippedForDate(goalId, dateStr) {
    const goal = this.get(goalId);
    if (!goal) return false;
    const dStr = dateStr || today();
    return Array.isArray(goal.skippedDates) && goal.skippedDates.includes(dStr);
  },

  /**
   * Toggle skip status for an individual occurrence
   */
  toggleSkipForDate(goalId, dateStr) {
    const all = this.getAll();
    const idx = all.findIndex(g => g.id === goalId);
    if (idx === -1) return false;

    const dStr = dateStr || today();
    const skipped = Array.isArray(all[idx].skippedDates) ? [...all[idx].skippedDates] : [];
    const existsIdx = skipped.indexOf(dStr);

    let isSkippedNow = false;
    if (existsIdx !== -1) {
      skipped.splice(existsIdx, 1);
      isSkippedNow = false;
    } else {
      skipped.push(dStr);
      isSkippedNow = true;
    }

    all[idx].skippedDates = skipped;
    all[idx].updatedAt = new Date().toISOString();
    Storage.set(KEYS.goals, all);
    return isSkippedNow;
  },

  /**
   * Get all active goals scheduled for date
   */
  getScheduledForDate(dateStr) {
    const dStr = dateStr || today();
    return this.getActive().filter(g => this.isScheduledForDate(g, dStr));
  },

  /**
   * Get all active habits that are resting on date
   */
  getRestDaysForDate(dateStr) {
    const dStr = dateStr || today();
    return this.getActive().filter(g => this.isRestDay(g, dStr));
  },

  /**
   * Calculate suggested weekly target from daily target and active days
   */
  calculateWeeklyTarget(dailyMins, selectedDays) {
    const count = Array.isArray(selectedDays) && selectedDays.length > 0 ? selectedDays.length : 7;
    return (parseInt(dailyMins) || 0) * count;
  }
};

// ─── Time Blocks ─────────────────────────────────────────────────────────────
export const BlockStore = {
  // Convert HH:MM to total minutes from midnight
  timeToMins(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  },

  // Convert total minutes to HH:MM string
  minsToTime(totalMins) {
    const normalized = ((totalMins % 1440) + 1440) % 1440;
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  _normalize(b) {
    if (!b) return null;
    return {
      id:                 b.id || uid(),
      date:               b.date || today(),
      title:              b.title || 'Focus Block',
      goalId:             b.goalId || null,
      startTime:          b.startTime || '09:00',
      endTime:            b.endTime || '10:00',
      notes:              b.notes || '',
      type:               b.type || 'focus', // 'focus' | 'break' | 'custom'
      color:              b.color || null,
      isRecurring:        b.isRecurring || false,
      recurrenceType:     b.recurrenceType || 'none', // 'none' | 'daily' | 'weekdays' | 'weekends' | 'selected_days' | 'weekly' | 'custom'
      selectedDays:       Array.isArray(b.selectedDays) ? b.selectedDays : [],
      recurrenceSeriesId: b.recurrenceSeriesId || null,
      pomodoroSettings:   b.pomodoroSettings || null,
      createdAt:          b.createdAt || new Date().toISOString(),
      updatedAt:          b.updatedAt || new Date().toISOString(),
    };
  },

  getAll() {
    const raw = Storage.get(KEYS.timeBlocks, []);
    return raw.map(b => this._normalize(b));
  },

  /**
   * Check if a recurring time block should appear on a date
   */
  isBlockScheduledForDate(block, dateStr) {
    if (!block.isRecurring || block.recurrenceType === 'none') {
      return block.date === dateStr;
    }
    // Block is recurring
    if (block.date > dateStr) return false; // don't appear before creation date
    const d = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = d.getDay();

    switch (block.recurrenceType) {
      case 'daily':
        return true;
      case 'weekdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      case 'weekends':
        return dayOfWeek === 0 || dayOfWeek === 6;
      case 'selected_days':
      case 'custom':
        return Array.isArray(block.selectedDays) && block.selectedDays.includes(dayOfWeek);
      case 'weekly':
        return Array.isArray(block.selectedDays) && block.selectedDays.length > 0
          ? block.selectedDays.includes(dayOfWeek)
          : new Date(block.date + 'T00:00:00').getDay() === dayOfWeek;
      default:
        return block.date === dateStr;
    }
  },

  /**
   * Get all blocks (explicit and recurring) for a specific date
   */
  getByDate(dateStr) {
    const d = dateStr || today();
    const all = this.getAll();
    const matching = all.filter(b => this.isBlockScheduledForDate(b, d));

    // Sort by startTime
    return matching.sort((a, b) => this.timeToMins(a.startTime) - this.timeToMins(b.startTime));
  },

  /**
   * Get all blocks across 7 days for a week starting on weekStartStr
   */
  getByWeek(weekStartStr) {
    const start = new Date(weekStartStr || weekStart());
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    const result = [];
    dates.forEach(dStr => {
      const dayBlocks = this.getByDate(dStr);
      dayBlocks.forEach(b => {
        result.push({ ...b, instanceDate: dStr });
      });
    });
    return result;
  },

  /**
   * Check for overlapping time blocks on the same date.
   * Touching boundaries (e.g. 10:45-11:00 and 11:00-12:00) are NOT considered overlapping.
   */
  getConflictingBlocks(date, startTime, endTime, excludeId = null) {
    const dStr = date || today();
    const newStart = this.timeToMins(startTime);
    const newEnd = this.timeToMins(endTime);

    // Handle overnight blocks if end < start
    const effectiveEnd = newEnd <= newStart ? newEnd + 1440 : newEnd;

    const existingBlocks = this.getByDate(dStr).filter(b => b.id !== excludeId);
    
    return existingBlocks.filter(b => {
      const bStart = this.timeToMins(b.startTime);
      let bEnd = this.timeToMins(b.endTime);
      if (bEnd <= bStart) bEnd += 1440;

      // Overlap condition: max(startA, startB) < min(endA, endB)
      return Math.max(newStart, bStart) < Math.min(effectiveEnd, bEnd);
    });
  },

  checkOverlap(blockData, excludeId = null) {
    return this.getConflictingBlocks(
      blockData.date,
      blockData.startTime,
      blockData.endTime,
      excludeId || blockData.id
    );
  },

  save(blockData) {
    const all = this.getAll();
    const now = new Date().toISOString();

    const normalized = this._normalize({
      ...blockData,
      updatedAt: now
    });

    if (normalized.id) {
      const idx = all.findIndex(b => b.id === normalized.id);
      if (idx !== -1) {
        all[idx] = normalized;
        Storage.set(KEYS.timeBlocks, all);
        return normalized;
      }
    }

    normalized.createdAt = now;
    all.push(normalized);
    Storage.set(KEYS.timeBlocks, all);
    return normalized;
  },

  delete(id) {
    const all = this.getAll().filter(b => b.id !== id);
    Storage.set(KEYS.timeBlocks, all);
  },
};

// ─── Sessions (reads same key as main.js) ────────────────────────────────────
export const SessionStore = {
  // Normalize any session record for backward compatibility & uniform units
  normalizeSession(s) {
    if (!s || typeof s !== 'object') return null;

    const id = s.id || Date.now();
    const type = s.type || 'focus';

    // Date normalization to YYYY-MM-DD
    let date = s.date;
    if (!date) {
      date = s.completedAt ? getLocalDateKey(s.completedAt) : today();
    } else if (date.includes('T')) {
      date = date.split('T')[0];
    }

    // Duration normalization:
    // Determine durationMinutes (canonical minutes) and duration (seconds)
    let durationMinutes = 0;
    let durationSeconds = 0;

    if (typeof s.durationMinutes === 'number' && s.durationMinutes > 0) {
      durationMinutes = Math.round(s.durationMinutes);
      durationSeconds = typeof s.duration === 'number' && s.duration > 0 ? s.duration : durationMinutes * 60;
    } else if (typeof s.duration === 'number' && s.duration > 0) {
      if (s.duration >= 300) {
        // Stored in seconds (e.g. 1500s for 25m, 3000s for 50m)
        durationSeconds = s.duration;
        durationMinutes = Math.round(s.duration / 60);
      } else {
        // Legacy session stored in minutes (e.g. 25, 50)
        durationMinutes = Math.round(s.duration);
        durationSeconds = durationMinutes * 60;
      }
    } else {
      durationMinutes = 25;
      durationSeconds = 25 * 60;
    }

    // Goal ID resolution & backward compatibility with goalName / goal
    let goalId = s.goalId ? String(s.goalId).trim() : null;
    let goalName = s.goalName || null;

    if (goalId) {
      const g = GoalStore.get(goalId);
      if (g) {
        goalName = g.name;
      }
    } else if (s.goalName || s.goal) {
      const matchName = String(s.goalName || s.goal).toLowerCase().trim();
      const allGoals = GoalStore.getAll();
      const matched = allGoals.find(g => g.name.toLowerCase().trim() === matchName || String(g.id).trim() === String(s.goal).trim());
      if (matched) {
        goalId = String(matched.id);
        goalName = matched.name;
      }
    }

    return {
      id,
      date,
      type,
      duration: durationSeconds,
      durationMinutes,
      goalId,
      goalName,
      completedAt: s.completedAt || new Date().toISOString()
    };
  },

  getAll() {
    const raw = Storage.get(KEYS.sessions, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(s => this.normalizeSession(s)).filter(Boolean);
  },

  add(sessionData) {
    const all = Storage.get(KEYS.sessions, []);
    const normalized = this.normalizeSession(sessionData);
    if (!normalized) return null;

    all.push(normalized);
    Storage.set(KEYS.sessions, all);

    // Dispatch custom event for reactive UI updates across the page
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flow:session-completed', { detail: normalized }));
      window.dispatchEvent(new CustomEvent('flow:storage-updated', { detail: { key: KEYS.sessions } }));
    }

    return normalized;
  },

  getToday() {
    const t = today();
    return this.getAll().filter(s => s.type === 'focus' && s.date === t);
  },

  getByDate(dateStr) {
    return this.getAll().filter(s => s.type === 'focus' && s.date === dateStr);
  },

  getByDateRange(startStr, endStr) {
    return this.getAll().filter(s => s.type === 'focus' && s.date >= startStr && s.date <= endStr);
  },

  getByGoal(goalId) {
    if (!goalId) return [];
    const strId = String(goalId).trim();
    return this.getAll().filter(s => s.type === 'focus' && s.goalId && String(s.goalId) === strId);
  },

  // Total pomodoros today
  todayCount() {
    return this.getToday().length;
  },

  // Total focus minutes for today
  todayMinutes() {
    return this.getToday().reduce((sum, s) => sum + s.durationMinutes, 0);
  },

  // Focus minutes for goal today
  todayMinutesForGoal(goalId) {
    if (!goalId) return 0;
    const strId = String(goalId).trim();
    return this.getToday()
      .filter(s => s.goalId && String(s.goalId) === strId)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  },

  // Focus minutes on a specific date
  minutesOnDate(dateStr) {
    return this.getByDate(dateStr).reduce((sum, s) => sum + s.durationMinutes, 0);
  },

  // Focus minutes for goal on a specific date
  minutesForGoalOnDate(goalId, dateStr) {
    if (!goalId) return 0;
    const strId = String(goalId).trim();
    return this.getByDate(dateStr)
      .filter(s => s.goalId && String(s.goalId) === strId)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  },

  // Focus minutes for goal in date range
  minutesForGoalInRange(goalId, startStr, endStr) {
    if (!goalId) return 0;
    const strId = String(goalId).trim();
    return this.getByDateRange(startStr, endStr)
      .filter(s => s.goalId && String(s.goalId) === strId)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  },

  // Minutes per day for the last N days
  dailyMinutes(days) {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateKey(d);
      const mins = this.minutesOnDate(dateStr);
      result.push({ date: dateStr, minutes: mins });
    }
    return result;
  },

  streakData() {
    const all = this.getAll();
    const dates = [...new Set(
      all.filter(s => s.type === 'focus').map(s => s.date)
    )].sort().reverse();

    if (!dates.length) return { current: 0, best: 0, dates: [] };

    const t = today();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDateKey(yesterdayDate);

    let current = 0;
    if (dates[0] === t || dates[0] === yesterday) {
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

    return { current, best: Math.max(best, current), dates };
  },
};

// ─── Challenges ───────────────────────────────────────────────────────────────
export const ChallengeStore = {
  getAll() {
    return Storage.get(KEYS.challenges, []);
  },

  getActive() {
    return this.getAll().filter(c => c.isActive !== false);
  },

  get(id) {
    return this.getAll().find(c => c.id === id) || null;
  },

  save(data) {
    const all = this.getAll();
    const now = new Date().toISOString();
    if (data.id) {
      const idx = all.findIndex(c => c.id === data.id);
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...data, updatedAt: now };
        Storage.set(KEYS.challenges, all);
        return all[idx];
      }
    }
    const challenge = {
      id:          uid(),
      name:        data.name || 'My Challenge',
      goalId:      data.goalId || null,
      dailyTarget: parseInt(data.dailyTarget) || 60,
      durationDays: parseInt(data.durationDays) || 30,
      startDate:   data.startDate || today(),
      isActive:    true,
      createdAt:   now,
      updatedAt:   now,
    };
    all.push(challenge);
    Storage.set(KEYS.challenges, all);
    return challenge;
  },

  delete(id) {
    const all = this.getAll().filter(c => c.id !== id);
    Storage.set(KEYS.challenges, all);
  },

  // Get progress for a challenge (array of booleans for each day)
  getProgress(challenge) {
    const start = new Date(challenge.startDate + 'T00:00:00');
    const progress = [];
    const todayStr = today();
    for (let i = 0; i < challenge.durationDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = getLocalDateKey(d);
      if (dateStr > todayStr) break;
      const dayMins = challenge.goalId
        ? SessionStore.minutesForGoalOnDate(challenge.goalId, dateStr)
        : SessionStore.minutesOnDate(dateStr);
      progress.push(dayMins >= challenge.dailyTarget);
    }
    return progress;
  },

  // Days elapsed since start
  daysElapsed(challenge) {
    const start = new Date(challenge.startDate);
    const now = new Date();
    return Math.min(
      Math.floor((now - start) / 86400000) + 1,
      challenge.durationDays
    );
  },

  // Days remaining
  daysRemaining(challenge) {
    return Math.max(0, challenge.durationDays - this.daysElapsed(challenge));
  },
};

// ─── Daily Reviews ─────────────────────────────────────────────────────────────
export const ReviewStore = {
  _getAll() {
    return Storage.get(KEYS.dailyReview, {});
  },

  getDaily(dateStr) {
    return this._getAll()[dateStr || today()] || null;
  },

  saveDaily(data) {
    const all = this._getAll();
    const dateStr = data.date || today();
    all[dateStr] = {
      ...data,
      date: dateStr,
      submittedAt: new Date().toISOString(),
    };
    Storage.set(KEYS.dailyReview, all);
  },

  getLastNDays(n) {
    const all = this._getAll();
    const result = [];
    for (let i = 0; i < n; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (all[dateStr]) result.push(all[dateStr]);
    }
    return result;
  },

  _getWeeklyAll() {
    return Storage.get(KEYS.weeklyReview, {});
  },

  getWeekly(weekStartStr) {
    const key = weekStartStr || weekStart();
    return this._getWeeklyAll()[key] || null;
  },

  saveWeekly(data) {
    const all = this._getWeeklyAll();
    const key = data.weekStart || weekStart();
    all[key] = {
      ...data,
      weekStart: key,
      submittedAt: new Date().toISOString(),
    };
    Storage.set(KEYS.weeklyReview, all);
  },
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const SettingsStore = {
  get() {
    return Storage.get(KEYS.settings, {
      focus: 25,
      short: 5,
      long: 15,
      goal: 4,
      defaultMode: 'simple',
      plannerStart: '06:00',
      plannerEnd: '23:00',
      plannerInterval: 15,
      firstDayOfWeek: 1, // 0=Sunday, 1=Monday
      warnOverlap: true,
    });
  },

  save(data) {
    Storage.set(KEYS.settings, { ...this.get(), ...data });
  },
};

// ─── Onboarding ───────────────────────────────────────────────────────────────
export const OnboardingStore = {
  get() {
    return Storage.get(KEYS.onboarding, { completed: false, mode: 'simple' });
  },

  complete(mode) {
    Storage.set(KEYS.onboarding, { completed: true, mode: mode || 'simple' });
  },

  isCompleted() {
    return this.get().completed === true;
  },
};

// ─── Theme ────────────────────────────────────────────────────────────────────
export const ThemeStore = {
  get() {
    return Storage.get(KEYS.theme, 'dark');
  },

  set(theme) {
    Storage.set(KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },

  init() {
    const theme = this.get();
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  },
};

// ─── Export helpers ────────────────────────────────────────────────────────────
export function exportAllData() {
  return {
    exportedAt: new Date().toISOString(),
    goals:      GoalStore.getAll(),
    timeBlocks: BlockStore.getAll(),
    challenges: ChallengeStore.getAll(),
    reviews:    Storage.get('flow_daily_reviews', {}),
    weeklyReviews: Storage.get('flow_weekly_reviews', {}),
    sessions:   SessionStore.getAll(),
    settings:   SettingsStore.get(),
  };
}

export { today, weekStart as weekStartDate };
export function formatMinutes(mins) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
