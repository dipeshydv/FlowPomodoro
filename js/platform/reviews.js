/* ==========================================================================
   FLOWPOMODORO — Reviews Page JS
   Manages Daily debriefs (6 questions) and Weekly reflections (7 questions),
   plus historical review logs.
   ========================================================================== */

import { initSidebar } from '/js/platform/sidebar.js';
import { ReviewStore } from '/js/platform/store.js';
import { showToast, openModal, closeModal, formatDateLong, today, thisWeekStart } from '/js/platform/ui-helpers.js';

let activeTab = 'daily'; // 'daily' | 'weekly'
let editingDaily = false;
let editingWeekly = false;

const container = document.getElementById('review-content');
const pastModal = document.getElementById('past-review-modal');
const pastTitle = document.getElementById('p-rev-title');
const pastBody = document.getElementById('p-rev-body');

// ─── Render Active Tab ────────────────────────────────────────────────────────
function render() {
  if (activeTab === 'daily') {
    renderDailyTab();
  } else {
    renderWeeklyTab();
  }
}

// ─── Daily Review Tab ─────────────────────────────────────────────────────────
function renderDailyTab() {
  const todayStr = today();
  const existing = ReviewStore.getDaily(todayStr);
  const pastReviews = ReviewStore.getLastNDays(7).filter(r => r.date !== todayStr);

  let formOrBanner = '';

  if (existing && !editingDaily) {
    formOrBanner = `
      <div class="review-submitted-banner" style="margin-bottom:24px;">
        <i class="fas fa-circle-check" style="font-size:1.2rem;"></i>
        <div style="flex:1;">
          <div style="font-weight:700;">Daily review completed for today!</div>
          <div style="font-size:12px;opacity:0.85;">Submitted at ${new Date(existing.submittedAt).toLocaleTimeString()}</div>
        </div>
        <button class="btn-secondary btn-sm" id="edit-daily-btn">
          <i class="fas fa-pencil"></i> Edit Responses
        </button>
      </div>

      <div class="pf-panel" style="margin-bottom:32px;">
        <div class="pf-panel-header">
          <span class="pf-panel-title">Today's Reflection — ${formatDateLong(todayStr)}</span>
        </div>
        <div class="pf-panel-body" style="display:flex;flex-direction:column;gap:16px;">
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">1. ACCOMPLISHMENTS</div>
            <div style="font-size:14px;margin-top:2px;">${escapeHtml(existing.accomplished) || '—'}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">2. WHAT WENT WELL</div>
            <div style="font-size:14px;margin-top:2px;">${escapeHtml(existing.wentWell) || '—'}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">3. WHAT DIDN'T GO WELL</div>
            <div style="font-size:14px;margin-top:2px;">${escapeHtml(existing.didntGoWell) || '—'}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">4. DISTRACTIONS</div>
            <div style="font-size:14px;margin-top:2px;">${escapeHtml(existing.distractions) || '—'}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">5. IMPROVEMENT FOR TOMORROW</div>
            <div style="font-size:14px;margin-top:2px;">${escapeHtml(existing.improvements) || '—'}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">6. TOP PRIORITY FOR TOMORROW</div>
            <div style="font-size:14px;font-weight:700;color:var(--brand-primary);margin-top:2px;">${escapeHtml(existing.tomorrowPriority) || '—'}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    formOrBanner = `
      <div class="pf-panel" style="margin-bottom:32px;">
        <div class="pf-panel-header">
          <span class="pf-panel-title">Daily Debrief — ${formatDateLong(todayStr)}</span>
          <span style="font-size:12px;color:var(--text-muted);">Spend 3 minutes reflecting on your focus</span>
        </div>
        <div class="pf-panel-body">
          <form id="daily-review-form" class="review-form">
            
            <div class="review-question">
              <label class="review-question-label">1. What did you accomplish today?</label>
              <span class="review-question-hint">Key tasks, completed pomodoros, or milestone progress</span>
              <textarea class="pf-textarea" id="dr-accomplished" placeholder="Finished module refactoring, completed 6 sessions...">${existing?.accomplished || ''}</textarea>
            </div>

            <div class="review-question">
              <label class="review-question-label">2. What went well?</label>
              <span class="review-question-hint">Moments of deep flow, good habits, or positive energy</span>
              <textarea class="pf-textarea" id="dr-went-well" placeholder="Started early without checking email...">${existing?.wentWell || ''}</textarea>
            </div>

            <div class="review-question">
              <label class="review-question-label">3. What didn't go as planned?</label>
              <span class="review-question-hint">Roadblocks, unexpected friction, or procrastination</span>
              <textarea class="pf-textarea" id="dr-didnt-go-well" placeholder="Got stuck debugging for an hour without taking a break...">${existing?.didntGoWell || ''}</textarea>
            </div>

            <div class="review-question">
              <label class="review-question-label">4. What distracted you?</label>
              <span class="review-question-hint">Internal interruptions or external notifications</span>
              <textarea class="pf-textarea" id="dr-distractions" placeholder="Phone notifications, YouTube tab...">${existing?.distractions || ''}</textarea>
            </div>

            <div class="review-question">
              <label class="review-question-label">5. What would you do differently next time?</label>
              <span class="review-question-hint">One actionable process improvement</span>
              <textarea class="pf-textarea" id="dr-improvements" placeholder="Put phone in another room before 9am...">${existing?.improvements || ''}</textarea>
            </div>

            <div class="review-question">
              <label class="review-question-label">6. What is your #1 top priority for tomorrow?</label>
              <span class="review-question-hint">The single highest-impact task for tomorrow morning</span>
              <input type="text" class="pf-input" id="dr-priority" placeholder="Finish the essay draft before lunch" value="${existing?.tomorrowPriority || ''}">
            </div>

            <div style="display:flex;gap:10px;margin-top:8px;">
              <button type="submit" class="btn-primary">
                <i class="fas fa-check"></i> Save Daily Review
              </button>
              ${editingDaily ? `<button type="button" class="btn-secondary" id="cancel-edit-daily">Cancel</button>` : ''}
            </div>

          </form>
        </div>
      </div>
    `;
  }

  // Past Reviews section
  const pastListHtml = pastReviews.length ? pastReviews.map(r => `
    <div class="past-review-item" data-date="${r.date}">
      <div>
        <div class="past-review-date">${formatDateLong(r.date)}</div>
        <div class="past-review-preview">${escapeHtml(r.accomplished || r.tomorrowPriority || 'Completed review')}</div>
      </div>
      <i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:12px;"></i>
    </div>
  `).join('') : '<div style="font-size:13px;color:var(--text-muted);">No previous daily reviews yet.</div>';

  container.innerHTML = `
    ${formOrBanner}

    <div>
      <div class="pf-section-header">
        <h2 class="pf-section-title">Past Daily Reviews (Last 7 Days)</h2>
      </div>
      <div class="past-reviews-list">
        ${pastListHtml}
      </div>
    </div>
  `;

  // Bind edit / form events
  document.getElementById('edit-daily-btn')?.addEventListener('click', () => {
    editingDaily = true;
    renderDailyTab();
  });

  document.getElementById('cancel-edit-daily')?.addEventListener('click', () => {
    editingDaily = false;
    renderDailyTab();
  });

  document.getElementById('daily-review-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      date: todayStr,
      accomplished: document.getElementById('dr-accomplished').value.trim(),
      wentWell: document.getElementById('dr-went-well').value.trim(),
      didntGoWell: document.getElementById('dr-didnt-go-well').value.trim(),
      distractions: document.getElementById('dr-distractions').value.trim(),
      improvements: document.getElementById('dr-improvements').value.trim(),
      tomorrowPriority: document.getElementById('dr-priority').value.trim()
    };

    ReviewStore.saveDaily(data);
    editingDaily = false;
    showToast('Daily review saved ✓', 'success');
    renderDailyTab();
  });

  // Past review clicks
  container.querySelectorAll('.past-review-item').forEach(item => {
    item.addEventListener('click', () => showPastReviewModal(item.dataset.date));
  });
}

// ─── Weekly Review Tab ────────────────────────────────────────────────────────
function renderWeeklyTab() {
  const weekMon = thisWeekStart();
  const existing = ReviewStore.getWeekly(weekMon);

  let formOrBanner = '';

  if (existing && !editingWeekly) {
    formOrBanner = `
      <div class="review-submitted-banner" style="margin-bottom:24px;">
        <i class="fas fa-circle-check" style="font-size:1.2rem;"></i>
        <div style="flex:1;">
          <div style="font-weight:700;">Weekly review completed!</div>
          <div style="font-size:12px;opacity:0.85;">Submitted at ${new Date(existing.submittedAt).toLocaleDateString()}</div>
        </div>
        <button class="btn-secondary btn-sm" id="edit-weekly-btn">
          <i class="fas fa-pencil"></i> Edit Responses
        </button>
      </div>

      <div class="pf-panel">
        <div class="pf-panel-header">
          <span class="pf-panel-title">Weekly Retrospective — Week of ${formatDateLong(weekMon)}</span>
        </div>
        <div class="pf-panel-body" style="display:flex;flex-direction:column;gap:16px;">
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">1. BIGGEST WIN</div>
            <div style="font-size:14px;margin-top:2px;">${escapeHtml(existing.biggestWin) || '—'}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">2. BIGGEST CHALLENGE / PROBLEM</div>
            <div style="font-size:14px;margin-top:2px;">${escapeHtml(existing.biggestProblem) || '—'}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">3. KEY LESSON</div>
            <div style="font-size:14px;margin-top:2px;">${escapeHtml(existing.lesson) || '—'}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div style="background:var(--bg-main);padding:12px;border-radius:var(--radius-md);">
              <div style="font-size:11px;font-weight:700;color:#ef4444;">STOP</div>
              <div style="font-size:13px;margin-top:4px;">${escapeHtml(existing.stop) || '—'}</div>
            </div>
            <div style="background:var(--bg-main);padding:12px;border-radius:var(--radius-md);">
              <div style="font-size:11px;font-weight:700;color:#22c55e;">START</div>
              <div style="font-size:13px;margin-top:4px;">${escapeHtml(existing.start) || '—'}</div>
            </div>
            <div style="background:var(--bg-main);padding:12px;border-radius:var(--radius-md);">
              <div style="font-size:11px;font-weight:700;color:var(--brand-primary);">CONTINUE</div>
              <div style="font-size:13px;margin-top:4px;">${escapeHtml(existing.continue) || '—'}</div>
            </div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted);font-weight:600;">7. TOP PRIORITY FOR NEXT WEEK</div>
            <div style="font-size:14px;font-weight:700;color:var(--brand-primary);margin-top:2px;">${escapeHtml(existing.nextPriority) || '—'}</div>
          </div>
        </div>
      </div>
    `;
  } else {
    formOrBanner = `
      <div class="pf-panel">
        <div class="pf-panel-header">
          <span class="pf-panel-title">Weekly Retrospective — Week of ${formatDateLong(weekMon)}</span>
          <span style="font-size:12px;color:var(--text-muted);">Reflect on high-level direction and systems</span>
        </div>
        <div class="pf-panel-body">
          <form id="weekly-review-form" class="review-form">
            
            <div class="review-question">
              <label class="review-question-label">1. What was your biggest win or breakthrough this week?</label>
              <textarea class="pf-textarea" id="wr-win" placeholder="Shipped the beta version...">${existing?.biggestWin || ''}</textarea>
            </div>

            <div class="review-question">
              <label class="review-question-label">2. What was your biggest obstacle or friction point?</label>
              <textarea class="pf-textarea" id="wr-problem" placeholder="Poor sleep mid-week killed afternoon focus...">${existing?.biggestProblem || ''}</textarea>
            </div>

            <div class="review-question">
              <label class="review-question-label">3. What is the single most important lesson from this week?</label>
              <textarea class="pf-textarea" id="wr-lesson" placeholder="Planning blocks the night before removes morning hesitation...">${existing?.lesson || ''}</textarea>
            </div>

            <div class="form-row">
              <div class="review-question">
                <label class="review-question-label" style="color:#ef4444;">4. What should you STOP doing?</label>
                <textarea class="pf-textarea" id="wr-stop" placeholder="Checking news during short breaks...">${existing?.stop || ''}</textarea>
              </div>
              <div class="review-question">
                <label class="review-question-label" style="color:#22c55e;">5. What should you START doing?</label>
                <textarea class="pf-textarea" id="wr-start" placeholder="Going for a 10m walk between deep sessions...">${existing?.start || ''}</textarea>
              </div>
            </div>

            <div class="review-question">
              <label class="review-question-label" style="color:var(--brand-primary);">6. What should you CONTINUE doing?</label>
              <textarea class="pf-textarea" id="wr-continue" placeholder="Using the 50/10 timer interval for complex tasks...">${existing?.continue || ''}</textarea>
            </div>

            <div class="review-question">
              <label class="review-question-label">7. What is your #1 strategic priority for next week?</label>
              <input type="text" class="pf-input" id="wr-priority" placeholder="Complete the full system integration" value="${existing?.nextPriority || ''}">
            </div>

            <div style="display:flex;gap:10px;margin-top:8px;">
              <button type="submit" class="btn-primary">
                <i class="fas fa-check"></i> Save Weekly Review
              </button>
              ${editingWeekly ? `<button type="button" class="btn-secondary" id="cancel-edit-weekly">Cancel</button>` : ''}
            </div>

          </form>
        </div>
      </div>
    `;
  }

  container.innerHTML = formOrBanner;

  document.getElementById('edit-weekly-btn')?.addEventListener('click', () => {
    editingWeekly = true;
    renderWeeklyTab();
  });

  document.getElementById('cancel-edit-weekly')?.addEventListener('click', () => {
    editingWeekly = false;
    renderWeeklyTab();
  });

  document.getElementById('weekly-review-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      weekStart: weekMon,
      biggestWin: document.getElementById('wr-win').value.trim(),
      biggestProblem: document.getElementById('wr-problem').value.trim(),
      lesson: document.getElementById('wr-lesson').value.trim(),
      stop: document.getElementById('wr-stop').value.trim(),
      start: document.getElementById('wr-start').value.trim(),
      continue: document.getElementById('wr-continue').value.trim(),
      nextPriority: document.getElementById('wr-priority').value.trim()
    };

    ReviewStore.saveWeekly(data);
    editingWeekly = false;
    showToast('Weekly review saved ✓', 'success');
    renderWeeklyTab();
  });
}

// ─── Modal Detail Viewer for Past Reviews ─────────────────────────────────────
function showPastReviewModal(dateStr) {
  const rev = ReviewStore.getDaily(dateStr);
  if (!rev) return;

  pastTitle.textContent = `Daily Review — ${formatDateLong(dateStr)}`;
  pastBody.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;">ACCOMPLISHMENTS</div>
        <div style="font-size:13px;margin-top:2px;">${escapeHtml(rev.accomplished) || '—'}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;">WHAT WENT WELL</div>
        <div style="font-size:13px;margin-top:2px;">${escapeHtml(rev.wentWell) || '—'}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;">WHAT DIDN'T GO WELL</div>
        <div style="font-size:13px;margin-top:2px;">${escapeHtml(rev.didntGoWell) || '—'}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;">DISTRACTIONS</div>
        <div style="font-size:13px;margin-top:2px;">${escapeHtml(rev.distractions) || '—'}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;">IMPROVEMENT</div>
        <div style="font-size:13px;margin-top:2px;">${escapeHtml(rev.improvements) || '—'}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;">TOP PRIORITY</div>
        <div style="font-size:13px;font-weight:700;color:var(--brand-primary);margin-top:2px;">${escapeHtml(rev.tomorrowPriority) || '—'}</div>
      </div>
    </div>
  `;

  openModal(pastModal);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Init Page ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar({
    pageId: 'reviews',
    pageTitle: 'Reviews',
    pageSubtitle: 'Reflect and continuously improve'
  });

  const tabs = document.querySelectorAll('#review-tabs .pf-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      render();
    });
  });

  document.getElementById('p-rev-close')?.addEventListener('click', () => closeModal(pastModal));
  document.getElementById('p-rev-close-btn')?.addEventListener('click', () => closeModal(pastModal));

  render();
});
