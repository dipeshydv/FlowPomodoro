import fs from 'node:fs';

let code = fs.readFileSync('js/platform/today.js', 'utf8');

// Find the clean first initialization
const marker = 'renderBlocks();\n});';
const firstPos = code.indexOf(marker);
if (firstPos !== -1) {
  code = code.slice(0, firstPos + marker.length);
}

// Add reactive listeners
code += `

// ─── Reactive Listeners ───────────────────────────────────────────────────────
window.addEventListener('flow:session-completed', () => { renderGoals(); renderBlocks(); });
window.addEventListener('flow:storage-updated', () => { renderGoals(); renderBlocks(); });
window.addEventListener('storage', (e) => {
  if (e.key === 'flow_history' || e.key === 'flow_goals' || e.key === 'flow_timeblocks') {
    renderGoals();
    renderBlocks();
  }
});
`;

// Update pomodoro links to pass goalId
code = code.replace(
  '<a href="/app/pomodoro.html" class="btn-secondary btn-sm" style="text-decoration:none;">\n                  <i class="fas fa-play"></i> Focus Anyway\n                </a>',
  '<a href="/app/pomodoro.html?goalId=${g.id}" class="btn-secondary btn-sm" style="text-decoration:none;">\n                  <i class="fas fa-play"></i> Focus Anyway\n                </a>'
);

code = code.replace(
  '<a href="/app/pomodoro.html" class="btn-secondary btn-sm" style="text-decoration:none;">\n                  <i class="fas fa-play"></i> Focus\n                </a>',
  '<a href="/app/pomodoro.html?goalId=${g.id}" class="btn-secondary btn-sm" style="text-decoration:none;">\n                  <i class="fas fa-play"></i> Focus\n                </a>'
);

// Add Focus button to scheduled cards
code = code.replace(
  `<span class="today-goal-status \${statusClass}">\${statusText}</span>\n              <button class="btn-skip-today"`,
  `<span class="today-goal-status \${statusClass}">\${statusText}</span>\n              <a href="/app/pomodoro.html?goalId=\${g.id}" class="btn-primary btn-sm" style="text-decoration:none;font-size:11px;padding:4px 8px;display:inline-flex;align-items:center;gap:4px;"><i class="fas fa-play"></i> Focus</a>\n              <button class="btn-skip-today"`
);

fs.writeFileSync('js/platform/today.js', code, 'utf8');
console.log('✓ js/platform/today.js updated successfully.');
