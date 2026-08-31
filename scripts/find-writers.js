const fs = require('fs');
const path = require('path');

const ROOT = 'c:\\Users\\Acer\\Desktop\\FlowPomodoro';

function checkFile(filePath) {
  const rel = filePath.replace(ROOT + '\\', '');
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch(e) { return; }
  const lines = content.split('\n');
  const hits = [];
  
  lines.forEach((line, i) => {
    const l = line.trim();
    if (
      l.includes('history.push') ||
      l.includes('flow_history') ||
      l.includes('onComplete') ||
      l.includes('onSessionComplete') ||
      (l.includes('src=') && l.includes('.js')) ||
      (l.includes('setItem') && l.includes('flow'))
    ) {
      hits.push('  L' + (i+1) + ': ' + l.slice(0, 120));
    }
  });
  
  if (hits.length > 0) {
    console.log('=== ' + rel + ' ===');
    hits.forEach(h => console.log(h));
    console.log('');
  }
}

// Check HTML pages
['app/pomodoro.html', 'app/index.html'].forEach(p => {
  const full = path.join(ROOT, p);
  if (fs.existsSync(full)) checkFile(full);
  else console.log('MISSING: ' + p);
});

// Check all JS files
const jsDir = path.join(ROOT, 'js');
fs.readdirSync(jsDir).forEach(f => {
  if (f.endsWith('.js') || f.endsWith('.mjs')) {
    checkFile(path.join(jsDir, f));
  }
});
