const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const seoDir = path.join(__dirname, '../pages/seo');
const files = fs.readdirSync(seoDir).filter(f => f.endsWith('.html'));

console.log(`Found ${files.length} SEO files to standardize in ${seoDir}`);

files.forEach(file => {
  const filePath = path.join(seoDir, file);
  const rawHtml = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(rawHtml);

  const title = $('title').text() || 'FlowPomodoro — Free Focus Timer';
  const description = $('meta[name="description"]').attr('content') || 'Free Pomodoro timer for deep work and focus.';
  const canonical = $('link[rel="canonical"]').attr('href') || `https://flowpomodoro.xyz/pages/seo/${file}`;
  
  // Extract all JSON-LD schemas
  const schemas = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    schemas.push($(el).html());
  });

  // Extract hero content
  let heroH1 = $('header.hero-section h1, .hero-section h1, h1').first().text().trim();
  let heroSubtitle = $('header.hero-section .hero-subtitle, .hero-section p, p.hero-subtitle').first().text().trim();
  if (!heroH1) heroH1 = title.split(':')[0].trim();
  if (!heroSubtitle) heroSubtitle = description;

  // Extract main SEO content
  let mainContent = $('main.seo-content, main, .seo-content').first().html();
  if (!mainContent) {
    mainContent = $('body').html();
  }

  // Clean up mainContent using cheerio
  const $main = cheerio.load(`<div class="seo-body-content">${mainContent}</div>`);
  // Remove any duplicated headers or navbars inside mainContent
  $main('nav, header, footer, script, style, .lp-nav, .lp-footer, .hero-section').remove();
  // Remove the first h1 if it's identical to heroH1
  if ($main('h1').first().text().trim() === heroH1) {
    $main('h1').first().remove();
  }

  // Replace any old button classes
  $main('.btn-xl, .btn-lg, .btn-primary').each((_, el) => {
    $(el).removeClass('btn-xl btn-lg btn-secondary').addClass('btn-primary');
  });

  const cleanedContent = $main('.seo-body-content').html().trim();

  // Construct standardized HTML
  const newHtml = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ESNYBTJ98S"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ESNYBTJ98S');
  </script>
  <meta charset="UTF-8">
  <meta name="robots" content="index, follow">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  <meta name="theme-color" content="#FAFAF7">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://flowpomodoro.xyz/og-image.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://flowpomodoro.xyz/og-image.jpg">

  <!-- Schemas -->
${schemas.map(s => `  <script type="application/ld+json">\n${s}\n  </script>`).join('\n')}

  <!-- Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous">

  <!-- Styles -->
  <link rel="stylesheet" href="/css/variables.css">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/layout.css">
  <link rel="stylesheet" href="/css/components.css">
  <link rel="stylesheet" href="/style.css">

  <style>
    .seo-hero { padding: clamp(80px, 10vw, 130px) 0 clamp(2rem, 4vw, 3.5rem); text-align: center; }
    .seo-hero h1 { font-size: clamp(2.2rem, 5vw, 3.5rem); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 1rem; }
    .seo-hero p { font-size: 1.15rem; color: var(--text-secondary); max-width: 680px; margin: 0 auto 2rem; line-height: 1.6; }
    
    .seo-container { max-width: 820px; margin: 0 auto 5rem; padding: 0 1.5rem; }
    .seo-article-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-2xl);
      padding: clamp(2rem, 5vw, 3.5rem);
      box-shadow: var(--shadow-sm);
    }
    
    .seo-article-card h2 { font-size: 1.6rem; font-weight: 800; color: var(--text-primary); margin: 2.5rem 0 1rem 0; letter-spacing: -0.02em; }
    .seo-article-card h2:first-of-type { margin-top: 0; }
    .seo-article-card h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 1.75rem 0 0.75rem 0; }
    .seo-article-card p { font-size: 1.05rem; line-height: 1.8; color: var(--text-secondary); margin: 0 0 1.35rem 0; }
    .seo-article-card ul, .seo-article-card ol { padding-left: 1.5rem; margin-bottom: 1.5rem; font-size: 1.05rem; line-height: 1.8; color: var(--text-secondary); }
    .seo-article-card li { margin-bottom: 0.5rem; }
    .seo-article-card strong { color: var(--text-primary); }
    .seo-article-card a { color: var(--brand-primary); text-decoration: underline; font-weight: 600; }
    
    .seo-cta-banner {
      background: var(--brand-soft);
      border: 1px solid rgba(255, 184, 0, 0.3);
      border-radius: var(--radius-xl);
      padding: 2rem;
      text-align: center;
      margin: 3rem 0;
    }
    html[data-theme="dark"] .seo-cta-banner {
      background: rgba(255, 184, 0, 0.08);
    }
    .seo-cta-banner h3 { font-size: 1.35rem; font-weight: 800; color: var(--text-primary); margin: 0 0 0.5rem 0; }
    .seo-cta-banner p { color: var(--text-secondary); margin: 0 0 1.25rem 0; font-size: 0.95rem; }
  </style>
</head>
<body>

<!-- ── Navigation ──────────────────────────────────────────────────────────── -->
<nav class="lp-nav" aria-label="Main navigation" id="main-nav">
  <div class="nav-inner">
    <a href="/" class="logo" aria-label="FlowPomodoro home">
      <div class="logo-dot"><i class="fas fa-stopwatch"></i></div>
      FlowPomodoro
    </a>

    <div class="nav-links" id="nav-links">
      <a href="/app/index.html" class="nav-link">Timer</a>
      <a href="/#features" class="nav-link">Features</a>
      <a href="/blog/" class="nav-link">Blog</a>
      <a href="/pages/pricing.html" class="nav-link">Pricing</a>
      <a href="/pages/about.html" class="nav-link">About</a>
    </div>

    <div class="nav-actions">
      <div class="lang-switcher" style="position:relative; display:inline-block;">
        <button class="btn-icon lang-btn" id="lang-menu-btn" aria-label="Select Language" title="Select Language">
          <i class="fas fa-globe"></i>
        </button>
        <div class="lang-dropdown" id="lang-dropdown" style="display:none; position:absolute; top:120%; right:0; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:12px; padding:0.5rem; min-width:150px; z-index:999; flex-direction:column; gap:0.2rem; box-shadow:var(--shadow-lg);">
          <a href="/pages/seo/${file}" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇺🇸 English</a>
          <a href="/blog/hi/" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇮🇳 Hindi</a>
          <a href="/blog/ne/" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇳🇵 Nepali</a>
          <a href="/blog/es/" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇪🇸 Spanish</a>
          <a href="/blog/vi/" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇻🇳 Vietnamese</a>
          <a href="/blog/ru/" class="lang-option" style="display:block; padding:0.5rem 1rem; color:var(--text-primary); text-decoration:none; border-radius:6px; font-size:0.85rem;">🇷🇺 Русский</a>
        </div>
      </div>

      <button class="btn-icon" id="theme-toggle" aria-label="Toggle theme">
        <i class="fas fa-sun"></i>
      </button>
      <a href="/pages/login.html" class="nav-link">Log in</a>
      <a href="/app/index.html" class="btn-primary">Start Focusing</a>
    </div>

    <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- Mobile Drawer -->
<div class="nav-drawer" id="nav-drawer" role="dialog" aria-modal="true" aria-label="Mobile navigation">
  <a href="/app/index.html" class="nav-drawer-link">Timer</a>
  <a href="/#features" class="nav-drawer-link">Features</a>
  <a href="/blog/" class="nav-drawer-link">Blog</a>
  <a href="/pages/pricing.html" class="nav-drawer-link">Pricing</a>
  <a href="/pages/about.html" class="nav-drawer-link">About</a>
  <div style="display:flex; gap:1rem; margin-top:2rem;">
    <a href="/pages/login.html" class="btn-secondary">Log in</a>
    <a href="/app/index.html" class="btn-primary">Start Focusing</a>
  </div>
</div>

<main id="main-content">
  <header class="seo-hero">
    <div class="container" style="max-width:860px; margin:0 auto; padding:0 1.5rem;">
      <div class="badge" style="background:var(--brand-soft); color:#926000; font-weight:700; margin-bottom:1rem; display:inline-block; padding:0.35rem 0.9rem; border-radius:999px;">
        <i class="fas fa-bolt"></i> Free Focus Timer
      </div>
      <h1>${heroH1}</h1>
      <p>${heroSubtitle}</p>
      <a href="/app/index.html" class="btn-primary btn-lg"><i class="fas fa-play"></i> Start Focusing Free</a>
    </div>
  </header>

  <div class="seo-container">
    <article class="seo-article-card">
      ${cleanedContent}

      <div class="seo-cta-banner">
        <h3>Ready to boost your productivity?</h3>
        <p>Start your next focused session right in your browser. No registration required.</p>
        <a href="/app/index.html" class="btn-primary btn-lg"><i class="fas fa-play"></i> Launch Timer Now</a>
      </div>
    </article>
  </div>
</main>

<!-- ── Footer ───────────────────────────────────────────────────────────────── -->
<footer class="lp-footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <a href="/" class="logo">
          <div class="logo-dot"><i class="fas fa-stopwatch"></i></div>
          FlowPomodoro
        </a>
        <p>A beautiful Pomodoro timer to help you focus deeply, beat procrastination, and build better habits.</p>
      </div>
      <div class="footer-col">
        <div class="fc-title">Product</div>
        <ul>
          <li><a href="/app/index.html">Timer</a></li>
          <li><a href="/#features">Features</a></li>
          <li><a href="/pages/pricing.html">Pricing</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <div class="fc-title">Resources</div>
        <ul>
          <li><a href="/blog/">Blog</a></li>
          <li><a href="/pages/about.html">About</a></li>
          <li><a href="/pages/download.html">Download</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <div class="fc-title">Legal</div>
        <ul>
          <li><a href="/pages/privacy.html">Privacy</a></li>
          <li><a href="/pages/terms.html">Terms</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div>© 2026 FlowPomodoro. All rights reserved.</div>
      <div class="fb-links">
        <a href="/pages/privacy.html">Privacy</a>
        <a href="/pages/terms.html">Terms</a>
        <a href="/blog/">Blog</a>
      </div>
    </div>
  </div>
</footer>

<script>
  const themeBtn = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('flow_theme') || 'light';
  html.setAttribute('data-theme', savedTheme);
  if(themeBtn) themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

  if(themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = html.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('flow_theme', newTheme);
      themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
  }

  const hamburger = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-drawer');
  if(hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });
  }

  const langBtn = document.getElementById('lang-menu-btn');
  const langDropdown = document.getElementById('lang-dropdown');
  if(langBtn && langDropdown) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.style.display = langDropdown.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', () => {
      langDropdown.style.display = 'none';
    });
  }
</script>

</body>
</html>`;

  fs.writeFileSync(filePath, newHtml, 'utf8');
  console.log(`Standardized: pages/seo/${file}`);
});

console.log('All SEO pages successfully standardized!');
