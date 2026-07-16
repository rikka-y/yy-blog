// 本地编辑服务：托管构建产物 + 提供文章读写 / 发布接口
// 仅用于在本机编辑博客，改完通过 /api/publish 推送到 GitHub。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const POSTS_FILE = path.join(__dirname, 'public', 'posts.json');
const PORT = process.env.PORT || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function readPosts() {
  return fs.readFileSync(POSTS_FILE, 'utf-8');
}

function writePosts(text) {
  fs.writeFileSync(POSTS_FILE, text);
}

function gitPublish() {
  return new Promise((resolve) => {
    // 仅跟踪内容文件，避免无谓提交
    execFile('git', ['add', 'public/posts.json'], { cwd: __dirname }, (err) => {
      if (err) return resolve({ ok: false, error: 'git add 失败：' + err.message });
      // 没有变化就不提交
      execFile('git', ['diff', '--cached', '--quiet'], { cwd: __dirname }, (diffErr) => {
        if (diffErr === null) {
          // 退出码 0 表示无差异
          return resolve({ ok: true, unchanged: true });
        }
        const msg = 'update posts via admin ' + new Date().toISOString().slice(0, 16);
        execFile('git', ['commit', '-m', msg], { cwd: __dirname }, (cErr) => {
          if (cErr) return resolve({ ok: false, error: 'git commit 失败：' + cErr.message });
          execFile('git', ['push'], { cwd: __dirname }, (pErr, _so, se) => {
            if (pErr) return resolve({ ok: false, error: 'git push 失败：' + (se || pErr.message) });
            resolve({ ok: true });
          });
        });
      });
    });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // 文章读取（直接读 public/posts.json，保证编辑即时可见）
  if (url.pathname === '/posts.json' || url.pathname === '/api/posts') {
    if (req.method === 'GET') {
      try {
        return sendJson(res, 200, JSON.parse(readPosts()));
      } catch {
        return sendJson(res, 500, { error: '读取文章失败' });
      }
    }
    if (req.method === 'POST') {
      readBody(req)
        .then((body) => {
          JSON.parse(body); // 校验合法性
          writePosts(body);
          return sendJson(res, 200, { ok: true });
        })
        .catch((e) => sendJson(res, 400, { error: '数据格式错误：' + e.message }));
      return;
    }
  }

  // 一键发布
  if (url.pathname === '/api/publish' && req.method === 'POST') {
    gitPublish().then((r) => sendJson(res, r.ok ? 200 : 500, r));
    return;
  }

  // 静态资源
  let filePath = path.join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // SPA 兜底：未知路径返回 index.html
      fs.readFile(path.join(DIST, 'index.html'), (e2, html) => {
        if (e2) {
          res.writeHead(404);
          return res.end('Not Found');
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(html);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`博客编辑服务已启动：http://localhost:${PORT}`);
  console.log(`后台地址：http://localhost:${PORT}/#/admin`);
});
