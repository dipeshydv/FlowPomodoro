document.addEventListener('DOMContentLoaded', () => {
  const switchers = document.querySelectorAll('.lang-switcher');
  if (!switchers.length) return;

  const currentLang = localStorage.getItem('fp_lang') || 'en';
  
  const langNames = {
    'en': 'EN',
    'hi': 'HI',
    'ne': 'NE',
    'es': 'ES',
    'vi': 'VI',
    'ru': 'RU'
  };

  let activeLang = 'en';
  const match = window.location.pathname.match(/\/blog\/([a-z]{2})\//);
  if (match) {
    activeLang = match[1];
    if (activeLang !== currentLang) {
      localStorage.setItem('fp_lang', activeLang);
    }
  } else {
    activeLang = currentLang;
  }

  switchers.forEach(switcher => {
    const textEl = switcher.querySelector('.current-lang-text');
    if (textEl) textEl.textContent = langNames[activeLang] || 'EN';

    const btn = switcher.querySelector('.lang-btn');
    const dropdown = switcher.querySelector('.lang-dropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    });

    const options = switcher.querySelectorAll('.lang-option');
    options.forEach(opt => {
      opt.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetLang = opt.getAttribute('data-lang');
        localStorage.setItem('fp_lang', targetLang);
        dropdown.style.display = 'none';

        const path = window.location.pathname;
        let newPath = path;

        if (path.includes('/blog/')) {
          if (match) {
            newPath = path.replace(`/${match[1]}/`, `/${targetLang}/`);
          } else if (path === '/blog/' || path === '/blog/index.html') {
            newPath = `/blog/${targetLang}/index.html`;
          } else if (path === '/blog') {
            newPath = `/blog/${targetLang}/index.html`;
          }

          try {
            const res = await fetch(newPath, { method: 'HEAD' });
            if (res.ok) {
              window.location.href = newPath;
            } else {
              console.warn('Translation not found, falling back to English');
              window.location.href = newPath.replace(`/${targetLang}/`, '/en/');
            }
          } catch (err) {
             window.location.href = newPath.replace(`/${targetLang}/`, '/en/');
          }
        } else {
          if (textEl) textEl.textContent = langNames[targetLang];
        }
      });
    });
  });

  document.addEventListener('click', () => {
    switchers.forEach(s => {
      const d = s.querySelector('.lang-dropdown');
      if (d) d.style.display = 'none';
    });
  });
});
