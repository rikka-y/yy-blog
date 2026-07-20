// 本地编辑服务：托管构建产物 + 提供文章读写 / 发布接口
// 仅用于在本机编辑博客，改完通过 /api/publish 推送到 GitHub。
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const POSTS_FILE = path.join(__dirname, 'public', 'posts.json');
const PROFILE_FILE = path.join(__dirname, 'public', 'profile.json');
const PORT = process.env.PORT || 4173;
const REPO = 'rikka-y/yy-blog';

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

function readProfile() {
  return fs.readFileSync(PROFILE_FILE, 'utf-8');
}

function writeProfile(text) {
  fs.writeFileSync(PROFILE_FILE, text);
}

function apiRequest(method, url, headers, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request(
      { method, hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'yy-blog-publisher', ...headers } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          resolve({ status: res.statusCode, data: json });
        });
      }
    );
    req.on('error', (e) => resolve({ status: 0, data: { error: e.message } }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// 通过 GitHub API 把指定文件推到仓库，触发 Actions 重新部署。
// token 取自项目根目录 .publish-token 或环境变量 GITHUB_TOKEN。
function publishFile(auth, filePath) {
  return (async () => {
    const getRes = await apiRequest(
      'GET',
      `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=main`,
      auth
    );
    if (getRes.status !== 200) {
      return { ok: false, error: `获取远程 ${filePath} 失败：HTTP ${getRes.status}` };
    }
    const sha = getRes.data.sha;
    const content = fs.readFileSync(path.join(__dirname, filePath)).toString('base64');
    if ((getRes.data.content || '').replace(/\s/g, '') === content) {
      return { ok: true, unchanged: true };
    }
    const putRes = await apiRequest(
      'PUT',
      `https://api.github.com/repos/${REPO}/contents/${filePath}`,
      auth,
      {
        message: `update ${filePath} via admin ` + new Date().toISOString().slice(0, 16),
        content,
        sha,
      }
    );
    if (putRes.status !== 200 && putRes.status !== 201) {
      return {
        ok: false,
        error: `发布 ${filePath} 失败：HTTP ${putRes.status} ${JSON.stringify(putRes.data).slice(0, 200)}`,
      };
    }
    return { ok: true };
  })();
}

function publishViaApi() {
  let token = '';
  try {
    token = fs.readFileSync(path.join(__dirname, '.publish-token'), 'utf-8').trim();
  } catch {}
  token = token || process.env.GITHUB_TOKEN || '';
  if (!token) {
    return Promise.resolve({
      ok: false,
      error: '未配置发布 token：请在项目根目录 .publish-token 写入 GitHub PAT，或设置环境变量 GITHUB_TOKEN',
    });
  }
  const auth = {
    Authorization: 'token ' + token,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
  const files = ['public/posts.json', 'public/profile.json'];
  return (async () => {
    let anyChanged = false;
    for (const f of files) {
      const r = await publishFile(auth, f);
      if (!r.ok) return r;
      if (!r.unchanged) anyChanged = true;
    }
    return { ok: true, unchanged: !anyChanged };
  })();
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

  // 个人资料读取（直接读 public/profile.json）
  if (url.pathname === '/profile.json' || url.pathname === '/api/profile') {
    if (req.method === 'GET') {
      try {
        return sendJson(res, 200, JSON.parse(readProfile()));
      } catch {
        return sendJson(res, 500, { error: '读取资料失败' });
      }
    }
    if (req.method === 'POST') {
      readBody(req)
        .then((body) => {
          JSON.parse(body);
          writeProfile(body);
          return sendJson(res, 200, { ok: true });
        })
        .catch((e) => sendJson(res, 400, { error: '数据格式错误：' + e.message }));
      return;
    }
  }

  // 一键发布
  if (url.pathname === '/api/publish' && req.method === 'POST') {
    publishViaApi().then((r) => sendJson(res, r.ok ? 200 : 500, r));
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
