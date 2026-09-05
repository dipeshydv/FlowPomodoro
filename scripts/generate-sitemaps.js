const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BASE_URL = 'https://flowpomodoro.xyz';
const LANGUAGES = ['en', 'hi', 'ne', 'es', 'vi', 'ru'];
const CATEGORIES = ['productivity', 'focus', 'study', 'time-management', 'habits', 'deep-work'];

// 25 Active Canonical Articles
const ACTIVE_SLUGS = [
  'what-is-the-pomodoro-method',
  'benefits-of-pomodoro-technique',
  'science-behind-pomodoro',
  'pomodoro-faq',
  'pomodoro-mistakes',
  'how-many-pomodoros-per-day',
  'best-pomodoro-apps',
  'flow-state-explained',
  'adhd-focus',
  'adhd-productivity-methods',
  'how-to-beat-procrastination',
  'distraction-control',
  'focus-techniques',
  'pomodoro-for-programming',
  'focus-techniques-for-developers',
  'pomodoro-for-exams',
  'how-to-study-for-long-hours',
  'student-productivity',
  'pomodoro-for-remote-workers',
  'daily-planning-system',
  'pomodoro-vs-time-blocking',
  'deep-work-guide',
  'pomodoro-vs-deep-work',
  'how-to-build-better-habits',
  'best-productivity-techniques'
];

const CORE_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' }
];

const TIMER_PAGES = [
  { path: '/timer/5-minute-timer.html', priority: '0.8', changefreq: 'monthly' },
  { path: '/timer/10-minute-timer.html', priority: '0.8', changefreq: 'monthly' },
  { path: '/timer/15-minute-timer.html', priority: '0.8', changefreq: 'monthly' },
  { path: '/timer/20-minute-timer.html', priority: '0.8', changefreq: 'monthly' },
  { path: '/timer/25-minute-timer.html', priority: '0.8', changefreq: 'monthly' },
  { path: '/timer/30-minute-timer.html', priority: '0.8', changefreq: 'monthly' },
  { path: '/timer/45-minute-timer.html', priority: '0.8', changefreq: 'monthly' },
  { path: '/timer/60-minute-timer.html', priority: '0.8', changefreq: 'monthly' },
  { path: '/timer/pomodoro-timer.html', priority: '0.9', changefreq: 'monthly' }
];

const STATIC_PAGES = [
  { path: '/pages/about.html', priority: '0.6', changefreq: 'monthly' },
  { path: '/pages/features.html', priority: '0.8', changefreq: 'weekly' },
  { path: '/pages/pricing.html', priority: '0.7', changefreq: 'monthly' },
  { path: '/pages/privacy.html', priority: '0.3', changefreq: 'monthly' },
  { path: '/pages/terms.html', priority: '0.3', changefreq: 'monthly' },
  { path: '/pages/download.html', priority: '0.6', changefreq: 'monthly' }
];

const TODAY = new Date().toISOString().split('T')[0];

function buildUrlEntry(urlPath, priority = '0.7', changefreq = 'weekly', lastmod = TODAY) {
  return `  <url>
    <loc>${BASE_URL}${urlPath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

// 1. Generate language sitemaps
LANGUAGES.forEach(lang => {
  const entries = [];
  
  // Blog hub
  entries.push(buildUrlEntry(`/blog/${lang}/`, '0.8', 'daily'));
  
  // Category pages
  CATEGORIES.forEach(cat => {
    entries.push(buildUrlEntry(`/blog/${lang}/${cat}.html`, '0.7', 'weekly'));
  });

  // Active articles
  ACTIVE_SLUGS.forEach(slug => {
    const priority = slug === 'what-is-the-pomodoro-method' ? '0.9' : '0.8';
    entries.push(buildUrlEntry(`/blog/${lang}/${slug}.html`, priority, 'weekly'));
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(ROOT_DIR, `sitemap-${lang}.xml`), xml, 'utf-8');
});

// 2. Generate sitemap-pages.xml
const pageEntries = [
  ...CORE_PAGES.map(p => buildUrlEntry(p.path, p.priority, p.changefreq)),
  ...TIMER_PAGES.map(p => buildUrlEntry(p.path, p.priority, p.changefreq)),
  ...STATIC_PAGES.map(p => buildUrlEntry(p.path, p.priority, p.changefreq))
];
const pagesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pageEntries.join('\n')}
</urlset>`;
fs.writeFileSync(path.join(ROOT_DIR, 'sitemap-pages.xml'), pagesXml, 'utf-8');

// 3. Generate Master sitemap.xml
const allEntries = [];

// App & Static
pageEntries.forEach(e => allEntries.push(e));

// All Languages
LANGUAGES.forEach(lang => {
  allEntries.push(buildUrlEntry(`/blog/${lang}/`, '0.8', 'daily'));
  CATEGORIES.forEach(cat => {
    allEntries.push(buildUrlEntry(`/blog/${lang}/${cat}.html`, '0.7', 'weekly'));
  });
  ACTIVE_SLUGS.forEach(slug => {
    const priority = slug === 'what-is-the-pomodoro-method' ? '0.9' : '0.8';
    allEntries.push(buildUrlEntry(`/blog/${lang}/${slug}.html`, priority, 'weekly'));
  });
});

const masterXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.join('\n')}
</urlset>`;
fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), masterXml, 'utf-8');

console.log('Successfully generated clean, valid sitemaps: sitemap.xml, sitemap-pages.xml, and sitemap-[lang].xml');
