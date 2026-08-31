/* ==========================================================================
   FLOWPOMODORO PLATFORM — Charts
   Pure SVG chart renderers — no external dependencies
   ========================================================================== */

/**
 * Render a sparkline (small line chart) into a container element
 * @param {HTMLElement} container
 * @param {number[]} values  — array of numbers
 * @param {string} color     — stroke color (hex)
 * @param {boolean} area     — fill area under the line
 */
export function renderSparkline(container, values, color = '#FFB800', area = true) {
  if (!container || !values || values.length < 2) {
    container && (container.innerHTML = '');
    return;
  }

  const W = container.offsetWidth || 120;
  const H = 40;
  const max = Math.max(...values, 1);
  const min = 0;
  const range = max - min || 1;
  const pad = 4;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return { x, y };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  let areaPath = '';
  if (area) {
    const areaD = [
      `M${points[0].x.toFixed(1)},${H}`,
      ...points.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`),
      `L${points[points.length-1].x.toFixed(1)},${H}`,
      'Z'
    ].join(' ');
    areaPath = `<path class="sparkline-area" d="${areaD}" fill="${color}" opacity="0.1"/>`;
  }

  container.innerHTML = `
    <svg class="sparkline-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:${H}px;">
      ${areaPath}
      <path class="sparkline-path" d="${pathD}" stroke="${color}" stroke-width="2"
        fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${points[points.length-1].x.toFixed(1)}"
              cy="${points[points.length-1].y.toFixed(1)}"
              r="3" fill="${color}"/>
    </svg>
  `;
}

/**
 * Render a bar chart into a container element
 * @param {HTMLElement} container
 * @param {{ label: string, value: number }[]} data
 * @param {string} color
 */
export function renderBarChart(container, data, color = '#FFB800') {
  if (!container || !data || !data.length) return;

  const max = Math.max(...data.map(d => d.value), 1);

  const bars = data.map(d => {
    const pct = (d.value / max) * 100;
    return `
      <div class="bar-chart-col" title="${d.label}: ${d.value}">
        <div class="bar-chart-bar" style="height:${Math.max(pct, 2)}%;background:${color};"></div>
        <div class="bar-chart-label">${d.label}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="bar-chart">${bars}</div>`;
}

/**
 * Render a donut/ring progress chart inside a container element
 * @param {HTMLElement} container
 * @param {number} pct — 0 to 100
 * @param {string} color
 * @param {string} label — center label (e.g. "70%")
 * @param {number} size — diameter in px
 */
export function renderProgressRing(container, pct, color = '#FFB800', label = '', size = 56) {
  if (!container) return;
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const borderColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--border-color').trim() || '#252B36';

  container.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"
         style="transform:rotate(-90deg);display:block;">
      <circle cx="${size/2}" cy="${size/2}" r="${r}"
        fill="none" stroke="${borderColor}" stroke-width="4"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}"
        fill="none" stroke="${color}" stroke-width="4"
        stroke-linecap="round"
        stroke-dasharray="${circ.toFixed(2)}"
        stroke-dashoffset="${offset.toFixed(2)}"
        style="transition:stroke-dashoffset 0.6s ease;"/>
    </svg>
    ${label ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${label}</div>` : ''}
  `;
  container.style.position = 'relative';
  container.style.display  = 'inline-block';
}

/**
 * Render a heatmap grid (60-day style) into a container
 * @param {HTMLElement} container
 * @param {{ date: string, value: number }[]} data
 * @param {string} color
 */
export function renderHeatmap(container, data, color = '#FFB800') {
  if (!container) return;

  const byDate = {};
  data.forEach(d => { byDate[d.date] = d.value; });

  const max = Math.max(...Object.values(byDate), 1);
  const days = [];

  for (let i = 59; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const val = byDate[dateStr] || 0;
    const opacity = val > 0 ? Math.max(0.15, val / max) : 0;
    days.push({ dateStr, val, opacity });
  }

  // Parse color to rgb
  let r = 255, g = 184, b = 0;
  const m = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (m) { r = parseInt(m[1],16); g = parseInt(m[2],16); b = parseInt(m[3],16); }

  container.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:3px;">
      ${days.map(d => `
        <div title="${d.dateStr}: ${d.val} min"
             style="width:12px;height:12px;border-radius:2px;
                    background:${d.val > 0 ? `rgba(${r},${g},${b},${d.opacity})` : 'var(--border-color)'};">
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render a week bar chart (7 days, Mon–Sun)
 * @param {HTMLElement} container
 * @param {{ date: string, minutes: number }[]} weekData — 7 items
 * @param {string} color
 */
export function renderWeekBars(container, weekData, color = '#FFB800') {
  if (!container) return;
  const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const max = Math.max(...weekData.map(d => d.minutes), 1);

  const bars = weekData.map((d, i) => {
    const pct = (d.minutes / max) * 100;
    const label = DAY_LABELS[i] || '';
    const isToday = d.date === new Date().toISOString().split('T')[0];
    return `
      <div class="bar-chart-col" title="${label}: ${d.minutes}min">
        <div class="bar-chart-bar" style="
          height:${Math.max(pct, 2)}%;
          background:${color};
          opacity:${isToday ? 1 : 0.65};
          outline:${isToday ? `2px solid ${color}` : 'none'};
        "></div>
        <div class="bar-chart-label" style="color:${isToday ? color : ''};">${label}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="bar-chart" style="height:120px;">${bars}</div>`;
}
