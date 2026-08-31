const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BLOG_DIR = path.join(__dirname, '../blog');
const REPORT_DIR = path.join(__dirname, '../migration-output');
const LANGUAGES = ['en', 'hi', 'ne', 'es', 'vi', 'ru'];

// Ensure report dir exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

let report = {
  totalChecked: 0,
  totalPassed: 0,
  totalFailed: 0,
  errors: [],
  warnings: []
};

function validateArticle(filePath, lang) {
  try {
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);
    
    let passed = true;
    const fileErrors = [];
    const fileWarnings = [];

    // HTML / DOM Checks
    if ($('html').length === 0) fileErrors.push('Missing <html> tag');
    if ($('head').length === 0) fileErrors.push('Missing <head> tag');
    if ($('body').length === 0) fileErrors.push('Missing <body> tag');
    
    const h1Count = $('h1').length;
    if (h1Count === 0) fileErrors.push('Missing H1');
    if (h1Count > 1) fileErrors.push('Multiple H1s');

    // Duplicate IDs check
    const ids = new Set();
    $('[id]').each((_, el) => {
      const id = $(el).attr('id');
      if (ids.has(id)) {
        fileErrors.push(`Duplicate ID found: ${id}`);
      }
      ids.add(id);
    });

    // SEO Checks
    if (!$('title').text()) fileErrors.push('Missing <title>');
    if (!$('meta[name="description"]').attr('content')) fileErrors.push('Missing meta description');
    if (!$('link[rel="canonical"]').attr('href')) fileErrors.push('Missing canonical URL');
    if (!$('meta[property="og:title"]').attr('content')) fileErrors.push('Missing og:title');
    if (!$('meta[property="og:description"]').attr('content')) fileErrors.push('Missing og:description');
    if (!$('meta[name="twitter:card"]').attr('content')) fileErrors.push('Missing twitter:card');

    const fileName = path.basename(filePath);
    const isCategoryPage = ['productivity.html', 'focus.html', 'study.html', 'time-management.html', 'habits.html', 'deep-work.html', 'index.html'].includes(fileName);

    // Structured Data Checks
    let hasArticleSchema = false;
    let hasBreadcrumbSchema = false;
    let hasBlogSchema = false;
    let hasFAQSchema = false;
    
    $('script[type="application/ld+json"]').each((_, el) => {
      const content = $(el).html();
      if (content.includes('"@type":"Article"') || content.includes('"@type": "Article"')) hasArticleSchema = true;
      if (content.includes('"@type":"BreadcrumbList"') || content.includes('"@type": "BreadcrumbList"')) hasBreadcrumbSchema = true;
      if (content.includes('"@type":"Blog"') || content.includes('"@type": "Blog"')) hasBlogSchema = true;
      if (content.includes('"@type":"FAQPage"') || content.includes('"@type": "FAQPage"')) hasFAQSchema = true;
    });

    if (isCategoryPage) {
      if (!hasBlogSchema) fileErrors.push('Missing Blog JSON-LD on category/archive page');
      if ($('.articles-grid .article-card').length === 0) fileErrors.push('Empty articles grid on category page');
    } else {
      if (!hasArticleSchema) fileErrors.push('Missing Article JSON-LD');
      if (!hasBreadcrumbSchema) fileErrors.push('Missing BreadcrumbList JSON-LD');

      // Components Check
      if ($('.toc-list li').length === 0) {
        fileWarnings.push('TOC appears to be empty');
      }
      const ctaCount = $('.focus-cta').length;
      if (ctaCount === 0) fileErrors.push('Missing Focus CTA');
      if (ctaCount > 1) fileErrors.push('Duplicate Focus CTA');
    }

    if (fileErrors.length > 0) {
      passed = false;
      report.errors.push({ file: filePath, issues: fileErrors });
    }
    if (fileWarnings.length > 0) {
      report.warnings.push({ file: filePath, issues: fileWarnings });
    }

    if (passed) {
      report.totalPassed++;
    } else {
      report.totalFailed++;
    }

  } catch (err) {
    report.totalFailed++;
    report.errors.push({ file: filePath, issues: [err.message] });
  }
}

function generateHtmlReport() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Migration Validation Report</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; padding: 2rem; max-width: 900px; margin: 0 auto; color: #333; }
    h1 { color: #111; }
    .summary { display: flex; gap: 2rem; margin-bottom: 2rem; background: #f5f5f5; padding: 1.5rem; border-radius: 8px; }
    .stat { display: flex; flex-direction: column; }
    .stat-val { font-size: 2rem; font-weight: bold; }
    .success { color: #10b981; }
    .error { color: #ef4444; }
    .warning { color: #f59e0b; }
    .list { margin-bottom: 2rem; }
    .item { margin-bottom: 1rem; padding: 1rem; border: 1px solid #ddd; border-radius: 4px; }
    .item-path { font-family: monospace; font-size: 0.9rem; color: #666; margin-bottom: 0.5rem; }
    ul { margin: 0; padding-left: 1.5rem; }
  </style>
</head>
<body>
  <h1>FlowPomodoro Validation Report</h1>
  <div class="summary">
    <div class="stat"><span>Total Checked</span><span class="stat-val">${report.totalChecked}</span></div>
    <div class="stat"><span class="success">Passed</span><span class="stat-val success">${report.totalPassed}</span></div>
    <div class="stat"><span class="error">Failed</span><span class="stat-val error">${report.totalFailed}</span></div>
    <div class="stat"><span class="warning">Warnings</span><span class="stat-val warning">${report.warnings.length} files</span></div>
  </div>

  <h2>Errors</h2>
  <div class="list">
    ${report.errors.length === 0 ? '<p>No critical errors found.</p>' : report.errors.map(e => `
      <div class="item">
        <div class="item-path">${e.file}</div>
        <ul>${e.issues.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>
    `).join('')}
  </div>

  <h2>Warnings</h2>
  <div class="list">
    ${report.warnings.length === 0 ? '<p>No warnings found.</p>' : report.warnings.map(w => `
      <div class="item">
        <div class="item-path">${w.file}</div>
        <ul>${w.issues.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
  fs.writeFileSync(path.join(REPORT_DIR, 'migration-report.html'), html, 'utf-8');
}

LANGUAGES.forEach(lang => {
  const langDir = path.join(BLOG_DIR, lang);
  if (!fs.existsSync(langDir)) return;
  const files = fs.readdirSync(langDir).filter(f => f.endsWith('.html') && f !== 'index.html');
  
  files.forEach(file => {
    report.totalChecked++;
    validateArticle(path.join(langDir, file), lang);
  });
});

// Output JSON
fs.writeFileSync(path.join(REPORT_DIR, 'validation-report.json'), JSON.stringify(report, null, 2));

// Output HTML
generateHtmlReport();

console.log('Validation complete. Reports generated at migration-output/migration-report.html');
console.log(`Checked: ${report.totalChecked} | Passed: ${report.totalPassed} | Failed: ${report.totalFailed}`);
