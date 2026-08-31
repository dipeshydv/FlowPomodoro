const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function serveFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Prevent browser caching of JS/CSS/HTML so changes always take effect immediately
  const noCacheExts = new Set(['.js', '.mjs', '.html', '.css']);
  const cacheHeader = noCacheExts.has(ext)
    ? 'no-store, no-cache, must-revalidate'
    : 'public, max-age=3600';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(statusCode, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': cacheHeader,
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Prevent directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let fullPath = path.join(ROOT_DIR, safePath);

  // Check if target is a file or directory
  fs.stat(fullPath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(res, fullPath);
      return;
    }

    if (!err && stats.isDirectory()) {
      const indexPath = path.join(fullPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        serveFile(res, indexPath);
        return;
      }
    }

    // Try appending .html (clean URLs)
    const htmlPath = fullPath + '.html';
    if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
      serveFile(res, htmlPath);
      return;
    }

    // 404 handler
    const notFoundPage = path.join(ROOT_DIR, '404.html');
    if (fs.existsSync(notFoundPage)) {
      serveFile(res, notFoundPage, 404);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 FlowPomodoro local server running at:`);
  console.log(`   > Local:   http://localhost:${PORT}/`);
  console.log(`   > App:     http://localhost:${PORT}/app/`);
  console.log(`   > Blog:    http://localhost:${PORT}/blog/\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallbackPort = PORT + 1;
    console.log(`Port ${PORT} is in use, trying port ${fallbackPort}...`);
    server.listen(fallbackPort);
  } else {
    console.error('Server error:', err);
  }
});
