const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const TIMER_DIR = path.join(ROOT_DIR, 'timer');

if (!fs.existsSync(TIMER_DIR)) {
  fs.mkdirSync(TIMER_DIR, { recursive: true });
}

const timers = [
  { mins: 5, title: '5 Minute Timer', slug: '5-minute-timer' },
  { mins: 10, title: '10 Minute Timer', slug: '10-minute-timer' },
  { mins: 15, title: '15 Minute Timer', slug: '15-minute-timer' },
  { mins: 20, title: '20 Minute Timer', slug: '20-minute-timer' },
  { mins: 25, title: '25 Minute Timer', slug: '25-minute-timer' },
  { mins: 30, title: '30 Minute Timer', slug: '30-minute-timer' },
  { mins: 45, title: '45 Minute Timer', slug: '45-minute-timer' },
  { mins: 60, title: '60 Minute Timer', slug: '60-minute-timer' },
  { mins: 25, title: 'Pomodoro Timer', slug: 'pomodoro-timer', type: 'pomodoro' }
];

const generateHTML = (timer) => {
  const isPom = timer.type === 'pomodoro';
  const displayTime = timer.mins < 10 ? `0${timer.mins}:00` : `${timer.mins}:00`;
  
  const h1 = timer.title;
  const titleTag = `${timer.title} – Free Online Timer | FlowPomodoro`;
  const desc = isPom 
    ? `A free online Pomodoro timer to help you focus. Use the proven 25-minute focus session technique for studying, working, or reading without distractions.`
    : `A simple, free online ${timer.title.toLowerCase()} for studying, working, exercising, or focused tasks. Fast, clean, and distraction-free.`;
  
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ESNYBTJ98S"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ESNYBTJ98S');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleTag}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="https://flowpomodoro.xyz/timer/${timer.slug}.html">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#FAFAF7">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://flowpomodoro.xyz/timer/${timer.slug}.html">
  <meta property="og:title" content="${titleTag}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="https://flowpomodoro.xyz/og-image.jpg">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous">

  <link rel="stylesheet" href="/css/variables.css">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/layout.css">
  <link rel="stylesheet" href="/css/components.css">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/css/animations.css">

  <style>
    .timer-page-hero {
      padding: clamp(80px, 12vw, 120px) 0 clamp(2rem, 5vw, 4rem);
      text-align: center;
      background: var(--bg-surface-hover);
    }
    .timer-page-hero h1 {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 1rem;
    }
    .timer-page-hero p {
      font-size: 1.1rem;
      color: var(--text-secondary);
      max-width: 600px;
      margin: 0 auto 2rem;
      line-height: 1.6;
    }
    
    .seo-timer-container {
      max-width: 480px;
      margin: -2rem auto 4rem;
      background: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 2.5rem;
      box-shadow: 0 12px 32px rgba(0,0,0,0.05);
      position: relative;
      z-index: 10;
    }
    html[data-theme="dark"] .seo-timer-container {
      box-shadow: 0 12px 32px rgba(0,0,0,0.25);
    }

    .timer-visual {
      position: relative;
      width: 100%;
      max-width: 300px;
      margin: 0 auto 2rem;
    }
    .ring-svg {
      width: 100%;
      transform: rotate(-90deg);
    }
    .ring-bg {
      fill: none;
      stroke: var(--border-color);
      stroke-width: 12;
    }
    .ring-progress {
      fill: none;
      stroke: var(--brand-primary);
      stroke-width: 12;
      stroke-linecap: round;
      stroke-dasharray: 1005;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 1s linear;
    }
    .timer-text-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .time-big {
      font-family: 'Outfit', sans-serif;
      font-size: 4.5rem;
      font-weight: 800;
      line-height: 1;
      color: var(--text-primary);
    }

    .timer-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5rem;
    }
    .btn-toggle-lg {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--brand-primary);
      color: #fff;
      font-size: 1.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(255, 184, 0, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn-toggle-lg:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(255, 184, 0, 0.4);
    }
    .btn-toggle-lg:active {
      transform: translateY(1px);
    }
    .btn-secondary-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--bg-surface-hover);
      color: var(--text-secondary);
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-secondary-circle:hover {
      color: var(--text-primary);
      background: var(--bg-surface);
      border-color: var(--text-muted);
    }

    .content-section {
      max-width: 800px;
      margin: 0 auto 4rem;
      padding: 0 1.5rem;
    }
    .content-section h2 {
      font-size: 1.8rem;
      margin-bottom: 1rem;
    }
    .content-section p {
      color: var(--text-secondary);
      line-height: 1.7;
      margin-bottom: 1.25rem;
    }
    .content-section ul {
      margin-bottom: 1.5rem;
      padding-left: 1.5rem;
      color: var(--text-secondary);
    }
    .content-section li {
      margin-bottom: 0.5rem;
    }
    
    .timer-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 2rem;
    }
    .timer-link-pill {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      padding: 0.5rem 1rem;
      border-radius: 999px;
      color: var(--text-primary);
      font-size: 0.85rem;
      text-decoration: none;
      transition: border-color 0.2s;
    }
    .timer-link-pill:hover {
      border-color: var(--brand-primary);
    }

    .conversion-banner {
      background: linear-gradient(135deg, rgba(255,184,0,0.1), rgba(255,184,0,0.02));
      border: 1px solid rgba(255,184,0,0.2);
      border-radius: 16px;
      padding: 2.5rem;
      text-align: center;
      margin-top: 3rem;
    }
    .conversion-banner h3 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }
    .conversion-banner p {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }
    
    /* Breadcrumb styling */
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      padding: clamp(80px, 10vw, 110px) 1.5rem 0;
      max-width: 1080px;
      margin: 0 auto;
    }
    .breadcrumb a { color: var(--text-muted); text-decoration: none; }
    .breadcrumb a:hover { color: var(--text-primary); }
  </style>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Home","item":"https://flowpomodoro.xyz/"},
      {"@type":"ListItem","position":2,"name":"Timers","item":"https://flowpomodoro.xyz/timer/"},
      {"@type":"ListItem","position":3,"name":"${timer.title}","item":"https://flowpomodoro.xyz/timer/${timer.slug}.html"}
    ]
  }
  </script>
</head>
<body>

<!-- Navigation -->
<nav class="lp-nav" aria-label="Main navigation" id="main-nav">
  <div class="nav-inner">
    <a href="/" class="logo" aria-label="FlowPomodoro home">
      <div class="logo-dot"><i class="fas fa-stopwatch"></i></div>
      FlowPomodoro
    </a>
    <div class="nav-links" id="nav-links">
      <a href="/pages/features.html" class="nav-link">Features</a>
      <a href="/blog/en/" class="nav-link">Blog</a>
      <a href="/pages/about.html" class="nav-link">About</a>
    </div>
    <div class="nav-actions">
      <button class="btn-icon" id="theme-toggle" aria-label="Toggle theme"><i class="fas fa-sun"></i></button>
      <a href="/app/dashboard.html" class="nav-link" style="font-size:0.875rem;">Open App</a>
      <a href="/app/dashboard.html" class="btn-primary">Start Focusing</a>
    </div>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<div class="nav-drawer" id="nav-drawer" role="dialog" aria-modal="true" aria-label="Mobile navigation">
  <a href="/pages/features.html" class="nav-drawer-link">Features</a>
  <a href="/blog/en/" class="nav-drawer-link">Blog</a>
  <a href="/pages/about.html" class="nav-drawer-link">About</a>
  <div style="display:flex;gap:1rem;margin-top:2rem;">
    <a href="/app/dashboard.html" class="btn-secondary">Open App</a>
    <a href="/app/dashboard.html" class="btn-primary">Start Focusing</a>
  </div>
</div>

<main>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <i class="fas fa-chevron-right" style="font-size:0.65rem;"></i>
    <span>Timers</span>
    <i class="fas fa-chevron-right" style="font-size:0.65rem;"></i>
    <span>${timer.title}</span>
  </nav>

  <section class="timer-page-hero">
    <div class="container">
      <h1>${h1}</h1>
      <p>${desc}</p>
    </div>
  </section>

  <div class="seo-timer-container">
    <div class="timer-visual" aria-hidden="true">
      <svg class="ring-svg" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
        <circle class="ring-bg" cx="180" cy="180" r="160"></circle>
        <circle class="ring-progress" id="timer-ring" cx="180" cy="180" r="160"></circle>
      </svg>
      <div class="timer-text-overlay">
        <div class="time-big" id="time-display">${displayTime}</div>
      </div>
    </div>
    <div class="timer-controls">
      <button class="btn-secondary-circle" id="reset-btn" aria-label="Reset Timer" title="Reset">
        <i class="fas fa-rotate-left"></i>
      </button>
      <button class="btn-toggle-lg" id="toggle-btn" aria-label="Start Timer">
        <i class="fas fa-play" id="toggle-icon"></i>
      </button>
      <button class="btn-secondary-circle" id="sound-test-btn" aria-label="Test Sound" title="Test Alarm Sound">
        <i class="fas fa-volume-up"></i>
      </button>
    </div>
    
    <!-- Hidden audio element for alarm -->
    <audio id="alarm-sound" preload="auto">
      <source src="/assets/alarm.mp3" type="audio/mpeg">
    </audio>
  </div>

  <section class="content-section">
    <h2>How to Use the ${timer.title}</h2>
    <p>This ${timer.title.toLowerCase()} is designed to be simple and distraction-free. It works entirely in your browser without requiring any downloads or signups.</p>
    <ol style="margin-left:1.5rem;margin-bottom:1.5rem;color:var(--text-secondary);line-height:1.7;">
      <li>Click the large <strong>Play</strong> button to start the countdown.</li>
      <li>If you need to step away, click the <strong>Pause</strong> button.</li>
      <li>To start over, click the <strong>Reset</strong> button on the left.</li>
      <li>When the time is up, an alarm will sound and a browser notification will appear (if you grant permission).</li>
    </ol>

    <h2>Why Use a ${timer.title}?</h2>
    <ul>
      ${isPom ? `
      <li><strong>Deep Focus:</strong> The Pomodoro technique naturally chunks your work into manageable 25-minute intervals.</li>
      <li><strong>Prevent Burnout:</strong> Enforced breaks after every session keep your mind fresh.</li>
      <li><strong>Build Momentum:</strong> It's easier to start working when you know it's only for 25 minutes.</li>
      ` : `
      <li><strong>Study Sessions:</strong> Perfect for time-boxed studying and reviewing notes.</li>
      <li><strong>Work Sprints:</strong> Focus intensely on a single task without checking emails or messages.</li>
      <li><strong>Exercise & Meditation:</strong> Time your workouts, stretches, or mindfulness sessions.</li>
      <li><strong>Breaks:</strong> Ensure your breaks don't accidentally turn into an hour of scrolling.</li>
      `}
    </ul>

    <div class="conversion-banner">
      <h3>More Than Just a Timer</h3>
      <p>FlowPomodoro helps you set goals, plan your day, focus with Pomodoro sessions, track your analytics, and build better habits in one free workspace.</p>
      <a href="/app/dashboard.html" class="btn-primary">Start Using FlowPomodoro</a>
    </div>

    <h2 style="margin-top: 4rem; font-size:1.4rem;">Other Popular Timers</h2>
    <div class="timer-links">
      ${timers.map(t => `<a href="/timer/${t.slug}.html" class="timer-link-pill">${t.title}</a>`).join('\n      ')}
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col">
        <a href="/" class="logo"><div class="logo-dot"><i class="fas fa-stopwatch"></i></div>FlowPomodoro</a>
        <p style="color:var(--text-muted);font-size:0.9rem;margin-top:1rem;">Your all-in-one workspace for planning, focusing, and tracking progress.</p>
      </div>
      <div class="footer-col">
        <div class="fc-title">Product</div>
        <ul>
          <li><a href="/app/dashboard.html">App</a></li>
          <li><a href="/pages/features.html">Features</a></li>
          <li><a href="/timer/pomodoro-timer.html">Timers</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <div class="fc-title">Resources</div>
        <ul>
          <li><a href="/blog/en/">Blog</a></li>
          <li><a href="/blog/en/what-is-the-pomodoro-method.html">Pomodoro Guide</a></li>
          <li><a href="/blog/en/daily-planning-system.html">Planning Guide</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <div class="fc-title">Company</div>
        <ul>
          <li><a href="/pages/about.html">About</a></li>
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
        <a href="/blog/en/">Blog</a>
      </div>
    </div>
  </div>
</footer>

<!-- Reusable SEO Timer Script -->
<script type="module">
  import { TimerEngine } from '/js/timer.js';

  const durationSecs = ${timer.mins} * 60;
  let timerInstance = null;
  const storageKey = 'seo_timer_${timer.slug}';

  const timeDisplay = document.getElementById('time-display');
  const ringProgress = document.getElementById('timer-ring');
  const toggleBtn = document.getElementById('toggle-btn');
  const toggleIcon = document.getElementById('toggle-icon');
  const resetBtn = document.getElementById('reset-btn');
  const soundTestBtn = document.getElementById('sound-test-btn');
  const alarmAudio = document.getElementById('alarm-sound');
  
  const CIRCUMFERENCE = 1005; // 2 * pi * 160 approx = 1005.3

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateUI(timeLeft, totalTime, isActive) {
    timeDisplay.textContent = formatTime(timeLeft);
    const progress = timeLeft / totalTime;
    ringProgress.style.strokeDashoffset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
    
    if (isActive) {
      toggleIcon.className = 'fas fa-pause';
      document.title = formatTime(timeLeft) + ' - ${timer.title}';
    } else {
      toggleIcon.className = 'fas fa-play';
      if (timeLeft === totalTime) {
         document.title = '${titleTag}';
      }
    }
  }

  function playAlarm() {
    if (alarmAudio) {
      alarmAudio.currentTime = 0;
      alarmAudio.play().catch(e => console.log('Audio autoplay prevented'));
    }
  }

  function sendNotification() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    
    const title = '✅ ${timer.title} Complete';
    const body = 'Your time is up! Great work.';
    const options = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/assets/favicon.svg',
      tag: 'seo-timer-complete',
      renotify: true
    };
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, options).catch(() => fallBackNotif(title, options));
      });
    } else {
      fallBackNotif(title, options);
    }
  }
  
  function fallBackNotif(title, options) {
    try {
      const n = new Notification(title, options);
      setTimeout(() => n.close(), 8000);
    } catch(e) {}
  }

  function onComplete(mode, duration) {
    if (window.gtag) {
      gtag('event', 'timer_completed', { 'timer_type': '${timer.title}' });
    }
    playAlarm();
    sendNotification();
    updateUI(0, durationSecs, false);
    document.title = 'Done! - ${timer.title}';
  }

  function init() {
    // Initialize TimerEngine with a custom storage key and don't load app settings
    timerInstance = new TimerEngine(updateUI, onComplete, storageKey, false);
    // Override the focus mode time
    timerInstance.modes.focus.time = durationSecs;
    timerInstance.currentMode = 'focus';
    
    // If not recovering from an active state, make sure we show the full time
    if (!timerInstance.isActive && timerInstance.timeLeft === 25 * 60) {
       timerInstance.timeLeft = durationSecs;
       timerInstance.totalTime = durationSecs;
    }
    updateUI(timerInstance.timeLeft, timerInstance.totalTime, timerInstance.isActive);

    toggleBtn.addEventListener('click', () => {
      // Request permission on first interaction
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      if (timerInstance.isActive) {
        timerInstance.pause();
      } else {
        if (timerInstance.timeLeft <= 0) {
           timerInstance.reset();
        }
        if (timerInstance.timeLeft === timerInstance.totalTime && window.gtag) {
          gtag('event', 'timer_started', { 'timer_type': '${timer.title}' });
        }
        timerInstance.start();
      }
    });

    resetBtn.addEventListener('click', () => {
      timerInstance.reset();
      updateUI(durationSecs, durationSecs, false);
      document.title = '${titleTag}';
    });

    soundTestBtn.addEventListener('click', () => {
      playAlarm();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
</script>

<script>
  // Simple UI scripts (Theme, Hamburger, Nav scroll)
  const themeBtn = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('flow_theme') || 'light';
  html.setAttribute('data-theme', savedTheme);
  if(themeBtn) themeBtn.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';

  if(themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = html.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('flow_theme', newTheme);
      themeBtn.innerHTML = newTheme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    });
  }

  const hamburger = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-drawer');
  if(hamburger && drawer) {
    hamburger.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('open');
      hamburger.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });
    drawer.querySelectorAll('a').forEach(l => l.addEventListener('click', () => {
      drawer.classList.remove('open');
      hamburger.classList.remove('open');
    }));
  }

  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 20));
</script>
</body>
</html>`;
};

timers.forEach(timer => {
  const html = generateHTML(timer);
  fs.writeFileSync(path.join(TIMER_DIR, `${timer.slug}.html`), html, 'utf8');
  console.log(`Generated ${timer.slug}.html`);
});
