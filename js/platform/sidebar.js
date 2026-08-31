/* ==========================================================================
   FLOWPOMODORO PLATFORM — Sidebar Renderer
   Renders the persistent sidebar and mobile bottom nav on all platform pages
   ========================================================================== */

import { ThemeStore } from './store.js';

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'fa-gauge-high',   href: '/app/dashboard.html' },
  { id: 'today',      label: 'Today',       icon: 'fa-sun',          href: '/app/today.html' },
  { id: 'pomodoro',   label: 'Pomodoro',    icon: 'fa-stopwatch',    href: '/app/pomodoro.html' },
  { id: 'goals',      label: 'Goals',       icon: 'fa-bullseye',     href: '/app/goals.html' },
  { id: 'planner',    label: 'Planner',     icon: 'fa-calendar-days',href: '/app/planner.html' },
  { id: 'analytics',  label: 'Analytics',   icon: 'fa-chart-line',   href: '/app/analytics.html' },
  { id: 'challenges', label: 'Challenges',  icon: 'fa-trophy',       href: '/app/challenges.html' },
  { id: 'reviews',    label: 'Reviews',     icon: 'fa-book-open',    href: '/app/reviews.html' },
  { id: 'settings',   label: 'Settings',    icon: 'fa-sliders',      href: '/app/settings.html' },
];

// Mobile bottom nav shows top 5 + "more" concept (just the most-used pages)
const MOBILE_NAV = ['dashboard', 'today', 'pomodoro', 'goals', 'more'];

// ─── Detect active page ───────────────────────────────────────────────────────
function getActivePage() {
  const path = window.location.pathname;
  if (path.includes('dashboard')) return 'dashboard';
  if (path.includes('today'))     return 'today';
  if (path.includes('pomodoro'))  return 'pomodoro';
  if (path.includes('goals'))     return 'goals';
  if (path.includes('planner'))   return 'planner';
  if (path.includes('analytics')) return 'analytics';
  if (path.includes('challenges'))return 'challenges';
  if (path.includes('reviews'))   return 'reviews';
  if (path.includes('settings'))  return 'settings';
  // index.html or /app/ = pomodoro
  return 'pomodoro';
}

// ─── Get user initials for avatar ─────────────────────────────────────────────
function getUserInitials() {
  return 'F'; // Anonymous user — show "F" for FlowPomodoro
}

// ─── Build sidebar HTML ───────────────────────────────────────────────────────
function buildSidebarHTML(activePage) {
  const navItems = NAV_ITEMS.map(item => `
    <a href="${item.href}" class="sidebar-item${item.id === activePage ? ' active' : ''}" data-page="${item.id}">
      <span class="sidebar-item-icon"><i class="fas ${item.icon}"></i></span>
      <span class="sidebar-item-label">${item.label}</span>
    </a>
  `).join('');

  return `
    <aside class="pf-sidebar" id="pf-sidebar">
      <div class="sidebar-header">
        <a href="/" class="sidebar-logo" aria-label="FlowPomodoro">
          <div class="sidebar-logo-icon"><i class="fas fa-stopwatch"></i></div>
          <span class="sidebar-logo-text">FlowPomodoro</span>
        </a>
        <button class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Toggle sidebar">
          <i class="fas fa-chevron-left"></i>
        </button>
      </div>

      <div class="sidebar-profile">
        <div class="sidebar-avatar" aria-hidden="true">${getUserInitials()}</div>
        <div class="sidebar-profile-info">
          <div class="sidebar-profile-name">My Workspace</div>
          <div class="sidebar-profile-plan">Free Plan</div>
        </div>
      </div>

      <nav class="sidebar-nav" aria-label="Platform navigation">
        ${navItems}
      </nav>

      <div class="sidebar-footer">
        <a href="/" class="sidebar-item" style="font-size:12px;">
          <span class="sidebar-item-icon"><i class="fas fa-arrow-left"></i></span>
          <span class="sidebar-item-label">Back to Home</span>
        </a>
      </div>
    </aside>

    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;
}

// ─── Build mobile bottom nav ──────────────────────────────────────────────────
function buildMobileNavHTML(activePage) {
  const mobileItems = [
    { id: 'dashboard', label: 'Home',      icon: 'fa-gauge-high',    href: '/app/dashboard.html' },
    { id: 'today',     label: 'Today',     icon: 'fa-sun',           href: '/app/today.html' },
    { id: 'pomodoro',  label: 'Timer',     icon: 'fa-stopwatch',     href: '/app/pomodoro.html' },
    { id: 'goals',     label: 'Goals',     icon: 'fa-bullseye',      href: '/app/goals.html' },
    { id: 'more',      label: 'More',      icon: 'fa-ellipsis',      href: '#' },
  ];

  const items = mobileItems.map(item => `
    <a href="${item.href}" class="mobile-nav-item${item.id === activePage ? ' active' : ''}" 
       ${item.id === 'more' ? 'id="mobile-more-btn"' : ''} aria-label="${item.label}">
      <i class="fas ${item.icon}"></i>
      <span>${item.label}</span>
    </a>
  `).join('');

  return `
    <nav class="mobile-bottom-nav" aria-label="Mobile navigation">
      <div class="mobile-bottom-nav-inner">
        ${items}
      </div>
    </nav>
  `;
}

// ─── Build topbar ─────────────────────────────────────────────────────────────
function buildTopbar(pageTitle, pageSubtitle, actionsHTML = '') {
  const theme = ThemeStore.get();
  return `
    <header class="pf-topbar">
      <div class="pf-topbar-left">
        <div class="pf-topbar-title">${pageTitle}</div>
        ${pageSubtitle ? `<div class="pf-topbar-subtitle">${pageSubtitle}</div>` : ''}
      </div>
      <div class="pf-topbar-actions">
        ${actionsHTML}
        <button class="pf-theme-btn" id="pf-theme-toggle" aria-label="Toggle theme" title="Toggle theme">
          <i class="fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>
        </button>
        <button class="pf-theme-btn" id="mobile-menu-btn" aria-label="Open menu" style="display:none;">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </header>
  `;
}

// ─── Inject and wire up ───────────────────────────────────────────────────────
export function initSidebar({ pageId, pageTitle, pageSubtitle = '', actionsHTML = '' } = {}) {
  const activePage = pageId || getActivePage();

  // Init theme first
  ThemeStore.init();

  // Inject sidebar before #pf-content
  const layout = document.getElementById('pf-layout');
  if (!layout) {
    console.error('[Sidebar] Missing #pf-layout element');
    return;
  }

  // Insert sidebar at beginning of layout
  layout.insertAdjacentHTML('afterbegin', buildSidebarHTML(activePage));

  // Insert topbar at beginning of content
  const content = document.getElementById('pf-content');
  if (content) {
    content.insertAdjacentHTML('afterbegin', buildTopbar(pageTitle, pageSubtitle, actionsHTML));
  }

  // Insert mobile nav at end of body
  document.body.insertAdjacentHTML('beforeend', buildMobileNavHTML(activePage));

  // Wire up collapse
  const sidebar = document.getElementById('pf-sidebar');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const overlay = document.getElementById('sidebar-overlay');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');

  // Restore collapsed state
  const isCollapsed = localStorage.getItem('flow_sidebar_collapsed') === 'true';
  if (isCollapsed && window.innerWidth > 768) {
    sidebar.classList.add('collapsed');
    layout.classList.add('sidebar-collapsed');
  }

  collapseBtn?.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      // Mobile: close drawer
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('open');
    } else {
      const collapsed = sidebar.classList.toggle('collapsed');
      layout.classList.toggle('sidebar-collapsed', collapsed);
      localStorage.setItem('flow_sidebar_collapsed', collapsed);
    }
  });

  // Mobile menu button (shown in topbar on mobile)
  mobileMenuBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('open');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('open');
  });

  // Show mobile menu btn on small screens
  function onResize() {
    if (mobileMenuBtn) {
      mobileMenuBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    }
  }
  onResize();
  window.addEventListener('resize', onResize);

  // Mobile "More" button → show remaining nav items as a small sheet
  const moreBtn = document.getElementById('mobile-more-btn');
  moreBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    sidebar.classList.add('mobile-open');
    overlay.classList.add('open');
  });

  // Theme toggle
  const themeBtn = document.getElementById('pf-theme-toggle');
  themeBtn?.addEventListener('click', () => {
    const next = ThemeStore.toggle();
    const icon = themeBtn.querySelector('i');
    if (icon) {
      icon.className = `fas ${next === 'dark' ? 'fa-sun' : 'fa-moon'}`;
    }
  });
}
