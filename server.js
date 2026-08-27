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
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
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

// 从 GitHub 拉取最新 posts.json / profile.json / images 到本地，
// 使电脑端编辑服务与线上（手机端发布的内容）保持一致。
// 仅当本地文件不比远程更新时才覆盖，避免冲掉本地未发布的草稿。
function pullLatestFromGitHub(force = false) {
  const token =
    (() => {
      try {
        return fs.readFileSync(path.join(__dirname, '.publish-token'), 'utf-8').trim();
      } catch {
        return '';
      }
    })() || process.env.GITHUB_TOKEN || '';
  const auth = {
    Accept: 'application/vnd.github.com+json',
    ...(token ? { Authorization: 'token ' + token } : {}),
  };
  const files = [
    { remote: 'posts.json', local: POSTS_FILE },
    { remote: 'profile.json', local: PROFILE_FILE },
  ];
  const imagesLocalDir = path.join(__dirname, 'public', 'images');
  const imagesDistDir = path.join(__dirname, 'dist', 'images');
  return (async () => {
    const results = [];
    // 同步 JSON 数据文件
    for (const f of files) {
      try {
        const res = await apiRequest(
          'GET',
          `https://api.github.com/repos/${REPO}/contents/${f.remote}?ref=main`,
          auth
        );
        if (res.status !== 200 || !res.data.content) {
          results.push({ file: f.remote, ok: false, error: 'HTTP ' + res.status });
          continue;
        }
        const remoteUpdated = new Date(res.data.updated_at).getTime();
        const localMtime = fs.existsSync(f.local) ? fs.statSync(f.local).mtimeMs : 0;
        if (!force && localMtime > remoteUpdated + 2000) {
          results.push({ file: f.remote, ok: true, skipped: true });
          continue;
        }
        const text = Buffer.from(res.data.content.replace(/\s/g, ''), 'base64').toString('utf-8');
        fs.writeFileSync(f.local, text);
        results.push({ file: f.remote, ok: true, pulled: true });
      } catch (e) {
        results.push({ file: f.remote, ok: false, error: e.message });
      }
    }
    // 同步 images 目录（手机端上传的图片）
    try {
      const res = await apiRequest(
        'GET',
        `https://api.github.com/repos/${REPO}/contents/public/images?ref=main`,
        auth
      );
      if (res.status === 200 && Array.isArray(res.data)) {
        fs.mkdirSync(imagesLocalDir, { recursive: true });
        fs.mkdirSync(imagesDistDir, { recursive: true });
        let imgPulled = 0;
        for (const entry of res.data) {
          if (entry.type !== 'file') continue;
          const localPath = path.join(imagesLocalDir, entry.name);
          const distPath = path.join(imagesDistDir, entry.name);
          const remoteUpdated = new Date(entry.updated_at || entry.date).getTime();
          const localMtime = fs.existsSync(localPath) ? fs.statSync(localPath).mtimeMs : 0;
          if (!force && localMtime > remoteUpdated + 2000) continue;
          const dl = await apiRequest(
            'GET',
            `https://api.github.com/repos/${REPO}/contents/public/images/${entry.name}?ref=main`,
            auth
          );
          if (dl.status !== 200 || !dl.data.content) continue;
          const buf = Buffer.from(dl.data.content.replace(/\s/g, ''), 'base64');
          fs.writeFileSync(localPath, buf);
          fs.writeFileSync(distPath, buf);
          imgPulled++;
        }
        results.push({ file: 'images/', ok: true, pulled: imgPulled > 0, count: imgPulled });
      } else {
        results.push({ file: 'images/', ok: true, skipped: true });
      }
    } catch (e) {
      results.push({ file: 'images/', ok: false, error: e.message });
    }
    return results;
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

  // 图片上传（本地模式）
  if (url.pathname === '/api/upload-image' && req.method === 'POST') {
    readBody(req)
      .then((body) => {
        const { fileName, base64 } = JSON.parse(body);
        if (!fileName || !base64) throw new Error('缺少 fileName 或 base64');
        const imagesDir = path.join(__dirname, 'public', 'images');
        fs.mkdirSync(imagesDir, { recursive: true });
        const filePath = path.join(imagesDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
        // 同时写一份到 dist 供本地即时预览
        const distDir = path.join(__dirname, 'dist', 'images');
        fs.mkdirSync(distDir, { recursive: true });
        fs.writeFileSync(path.join(distDir, fileName), Buffer.from(base64, 'base64'));
        return sendJson(res, 200, { ok: true, url: `/images/${fileName}` });
      })
      .catch((e) => sendJson(res, 400, { error: '上传失败：' + e.message }));
    return;
  }

  // 手动从 GitHub 同步最新数据到本地（强制覆盖，忽略本地草稿）
  if (url.pathname === '/api/sync' && req.method === 'POST') {
    pullLatestFromGitHub(true).then((r) => sendJson(res, 200, { ok: true, results: r }));
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
  // 启动即从 GitHub 拉取最新数据，使电脑端与手机端发布的内容保持一致
  pullLatestFromGitHub().then((r) => {
    r.forEach((x) =>
      console.log(
        `同步 ${x.file}: ${x.pulled ? '已拉取最新' : x.skipped ? '本地较新，跳过' : '失败 ' + (x.error || '')}`
      )
    );
  });
});
