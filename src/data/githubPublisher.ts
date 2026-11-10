// 前端 GitHub 发布：让手机/公开链接也能直接编辑发布，无需本地 server.js。
// token 存浏览器 localStorage（建议用 GitHub 细粒度 PAT，仅授权 rikka-y/yy-blog 的 Contents 读写）。
const REPO = 'rikka-y/yy-blog';
const TOKEN_KEY = 'yy-blog-gh-token';

export function getGHToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setGHToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearGHToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

// UTF-8 安全的 base64 编码（GitHub Contents API 要求 base64 content）
function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export type PublishResult = { ok: true; unchanged?: boolean } | { ok: false; error: string; status?: number };

async function publishFile(token: string, filePath: string, content: string): Promise<PublishResult> {
  const url = `https://api.github.com/repos/${REPO}/contents/${filePath}?ref=main`;
  const encoded = encodeBase64(content);

  // 取远端 sha。cache: 'no-store' 关键 —— GitHub API 的响应头是
  // `cache-control: private, max-age=60`，浏览器会把 sha 缓存 60 秒，
  // 第二次发布时带上旧 sha 就会被 GitHub 判为冲突并返回 409。
  const getSha = async (): Promise<string | undefined> => {
    const res = await fetch(url, { headers: authHeaders(token), cache: 'no-store' });
    if (!res.ok) return undefined;
    const data = await res.json();
    // 内容未变则跳过，避免空提交
    const remote = (data.content || '').replace(/\s/g, '');
    if (remote === encoded) return 'UNCHANGED';
    return data.sha as string | undefined;
  };

  let sha: string | undefined;
  try {
    sha = await getSha();
    if (sha === 'UNCHANGED') return { ok: true, unchanged: true };
    if (sha === undefined) {
      // 404 = 文件不存在，直接创建（不带 sha）
      const probe = await fetch(url, { headers: authHeaders(token), cache: 'no-store' });
      if (probe.status !== 404) {
        return { ok: false, error: `获取远程 ${filePath} 失败：HTTP ${probe.status}` };
      }
    }
  } catch (e) {
    return { ok: false, error: `网络错误：${e instanceof Error ? e.message : String(e)}` };
  }

  const put = async (useSha: string | undefined): Promise<PublishResult> => {
    const body: Record<string, string> = {
      message: `update ${filePath} via admin ${new Date().toISOString().slice(0, 16)}`,
      content: encoded,
    };
    if (useSha) body.sha = useSha;

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });
    if (putRes.status === 200 || putRes.status === 201) return { ok: true };
    const d = await putRes.json().catch(() => ({}));
    return {
      ok: false,
      error: `发布 ${filePath} 失败：HTTP ${putRes.status} ${JSON.stringify(d).slice(0, 200)}`,
      status: putRes.status,
    };
  };

  try {
    let r = await put(sha);
    // 409 = sha 过期（远端已被别的提交改动），重新取一次最新 sha 再试
    if (!r.ok && r.status === 409) {
      const fresh = await getSha();
      if (fresh === 'UNCHANGED') return { ok: true, unchanged: true };
      r = await put(fresh);
    }
    return r;
  } catch (e) {
    return { ok: false, error: `网络错误：${e instanceof Error ? e.message : String(e)}` };
  }
}

export interface PublishAllResult {
  ok: boolean;
  error?: string;
  changed?: boolean;
}

export async function publishAll(
  token: string,
  posts: unknown,
  profile: unknown,
): Promise<PublishAllResult> {
  if (!token) return { ok: false, error: '未设置发布令牌' };
  const files = [
    { path: 'public/posts.json', content: JSON.stringify(posts) },
    { path: 'public/profile.json', content: JSON.stringify(profile) },
  ];
  let changed = false;
  for (const f of files) {
    const r = await publishFile(token, f.path, f.content);
    if (!r.ok) return r;
    if (!r.unchanged) changed = true;
  }
  return { ok: true, changed };
}

// 上传图片到 public/images/，返回可用的 URL 路径
export async function uploadImage(
  token: string,
  base64Content: string,
  fileName: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const filePath = `public/images/${fileName}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
      method: 'PUT',
      headers: authHeaders(token),
      cache: 'no-store',
      body: JSON.stringify({
        message: `upload image ${fileName}`,
        content: base64Content,
      }),
    });
    if (res.status !== 200 && res.status !== 201) {
      const d = await res.json().catch(() => ({}));
      return { ok: false, error: `上传图片失败：HTTP ${res.status} ${JSON.stringify(d).slice(0, 200)}` };
    }
    return { ok: true, url: `images/${fileName}` };
  } catch (e) {
    return { ok: false, error: `网络错误：${e instanceof Error ? e.message : String(e)}` };
  }
}
