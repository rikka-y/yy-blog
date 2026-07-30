import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Download,
  RotateCcw,
  ArrowLeft,
  Cloud,
  Upload,
  RefreshCw,
  User,
  KeyRound,
  ImagePlus,
} from 'lucide-react';
import type { BlogPost, Category, SiteProfile } from '@/types/blog';
import { categories, categoryIcons } from '@/data/posts';
import { usePosts } from '@/data/PostsContext';
import { useProfile } from '@/data/ProfileContext';
import { getGHToken, setGHToken, clearGHToken, publishAll, uploadImage } from '@/data/githubPublisher';

function blankPost(): BlogPost {
  return {
    id: 'p' + Date.now(),
    title: '',
    category: '日常',
    date: new Date().toISOString().slice(0, 10),
    summary: '',
    content: '',
    coverEmoji: '📝',
  };
}

const btnPrimary =
  'inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90';
const btnGhost =
  'inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition hover:bg-accent';
const inputCls =
  'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';

// 客户端压缩图片：缩放到 maxSize 宽以内，转 JPEG base64
async function resizeImage(file: File, maxSize = 1600, quality = 0.85): Promise<{ base64: string }> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = url;
  });
  URL.revokeObjectURL(url);
  let { width, height } = img;
  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { base64: dataUrl.split(',')[1] };
}

export function AdminPage() {
  const { posts, loading, addPost, updatePost, deletePost, reset: resetPosts } = usePosts();
  const { profile, updateProfile, reset: resetProfile } = useProfile();

  const [view, setView] = useState<'posts' | 'profile'>('posts');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string>('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const [ghToken, setGhToken] = useState<string>(() => getGHToken());
  const [tokenInput, setTokenInput] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  // 个人资料表单
  const [pf, setPf] = useState<SiteProfile>(profile);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (view === 'profile') setPf(profile);
  }, [view, profile]);

  const openNew = () => {
    setEditing(blankPost());
    setFormOpen(true);
  };
  const openEdit = (p: BlogPost) => {
    setEditing({ ...p });
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSave = () => {
    if (!editing) return;
    if (!editing.title.trim()) {
      alert('标题不能为空');
      return;
    }
    const exists = posts.some((p) => p.id === editing.id);
    if (exists) updatePost(editing);
    else addPost(editing);
    closeForm();
  };

  const handleDelete = (p: BlogPost) => {
    if (confirm(`确定删除《${p.title || '无标题'}》吗？`)) deletePost(p.id);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 10 * 1024 * 1024) {
      alert('图片不能超过 10MB');
      return;
    }
    if (!editing) return;
    setUploadingImg(true);
    try {
      const { base64 } = await resizeImage(file);
      const fileName = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      let imgUrl: string;
      if (isLocal) {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, base64 }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || '上传失败');
        imgUrl = data.url;
      } else {
        const token = getGHToken();
        if (!token) throw new Error('请先设置发布令牌');
        const r = await uploadImage(token, base64, fileName);
        if (!r.ok) throw new Error(r.error);
        imgUrl = r.url;
      }
      const marker = `\n\n![图片](${imgUrl})\n\n`;
      const ta = contentRef.current;
      if (ta) {
        const pos = ta.selectionStart;
        setEditing({ ...editing, content: editing.content.slice(0, pos) + marker + editing.content.slice(pos) });
      } else {
        setEditing({ ...editing, content: editing.content + marker });
      }
    } catch (err) {
      alert('图片上传失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploadingImg(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(posts, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'posts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetPosts = () => {
    if (confirm('确定恢复为原始文章？（会清除你浏览器里的本地修改）')) resetPosts();
  };

  const handleSync = async () => {
    if (!isLocal) return;
    setSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      window.location.reload();
    } catch {
      alert('同步失败，请确认服务正在运行');
      setSyncing(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishMsg('');
    try {
      if (isLocal) {
        // 电脑端：走本地 server.js（含 .publish-token）
        const res = await fetch('/api/publish', { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setPublishMsg(
            data.unchanged
              ? '内容没有变化，无需发布 ✅'
              : '已推送到 GitHub，正在自动部署，稍候公开链接就会更新 🚀'
          );
        } else {
          setPublishMsg('发布失败：' + (data.error || '未知错误'));
        }
      } else {
        // 手机/公开端：前端直接调 GitHub API 推送
        const token = getGHToken();
        if (!token) {
          setPublishMsg('请先在下方输入并保存发布令牌。');
          return;
        }
        const r = await publishAll(token, posts, profile);
        if (r.ok) {
          setPublishMsg(
            r.changed
              ? '已推送到 GitHub，正在自动部署，稍候公开链接就会更新 🚀'
              : '内容没有变化，无需发布 ✅'
          );
        } else {
          setPublishMsg('发布失败：' + (r.error || '未知错误'));
        }
      }
    } catch (e) {
      setPublishMsg('发布失败：' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setPublishing(false);
    }
  };

  const onAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPf((f) => ({ ...f, avatar: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const saveProfile = () => updateProfile(pf);

  const handleResetProfile = () => {
    if (confirm('确定恢复为默认资料？')) resetProfile();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center text-muted-foreground">
        加载中…
      </div>
    );
  }

  // 非本地访问且未设置发布令牌：先要求输入令牌，避免暴露编辑界面
  if (!isLocal && !ghToken) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <KeyRound className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-xl font-bold">需要发布令牌</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            在手机上编辑发布，需要先输入一次 GitHub 发布令牌。令牌会存在这台手机的浏览器里，之后随时可用。
          </p>
          <input
            className={inputCls}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="github_pat_…"
          />
          <button
            onClick={() => {
              const t = tokenInput.trim();
              if (!t) {
                alert('请粘贴令牌');
                return;
              }
              setGHToken(t);
              setGhToken(t);
              setTokenInput('');
            }}
            className={`${btnPrimary} w-full justify-center`}
          >
            <Save className="h-4 w-4" /> 保存令牌
          </button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            没有令牌？在 GitHub → Settings → Developer settings → Personal access tokens → Fine-grained 生成，权限只给 rikka-y/yy-blog 的 Contents: Read and write。
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> 返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* 顶部操作栏 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> 返回
          </Link>
          <h1 className="text-2xl font-bold">🛠 后台编辑</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePublish} disabled={publishing} className={btnPrimary}>
            <Cloud className="h-4 w-4" /> {publishing ? '发布中…' : '发布到全网'}
          </button>
          <button onClick={handleExport} className={btnGhost} title="下载备份">
            <Download className="h-4 w-4" /> 导出备份
          </button>
          <button onClick={handleResetPosts} className={btnGhost}>
            <RotateCcw className="h-4 w-4" /> 恢复文章
          </button>
          {isLocal && (
            <button onClick={handleSync} disabled={syncing} className={btnGhost}>
              <RefreshCw className="h-4 w-4" /> {syncing ? '同步中…' : '从云端同步'}
            </button>
          )}
          <button onClick={openNew} className={btnPrimary}>
            <Plus className="h-4 w-4" /> 新建文章
          </button>
        </div>
      </div>

      {publishMsg && (
        <pre className="mb-6 whitespace-pre-wrap rounded-lg bg-accent/40 px-4 py-2 text-sm text-foreground">
          {publishMsg}
        </pre>
      )}

      {/* 非本地：已设令牌提示 + 清除 */}
      {!isLocal && ghToken && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-accent/40 px-4 py-2 text-sm">
          <span className="text-foreground">已设置发布令牌，可在手机上编辑发布 ✓</span>
          <button
            onClick={() => {
              clearGHToken();
              setGhToken('');
            }}
            className="text-muted-foreground underline hover:text-foreground"
          >
            清除令牌
          </button>
        </div>
      )}

      {/* 视图切换 */}
      <div className="mb-6 flex gap-1 rounded-xl border bg-card p-1">
        <button
          onClick={() => setView('posts')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            view === 'posts' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          文章管理
        </button>
        <button
          onClick={() => setView('profile')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            view === 'profile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
          }`}
        >
          个人资料
        </button>
      </div>

      {/* 文章管理 */}
      {view === 'posts' && (
        <>
          <p className="mb-6 rounded-lg bg-accent/40 px-4 py-2 text-sm text-muted-foreground">
            保存即写入项目文件；点「发布到全网」会自动提交并推送到 GitHub，公开链接随之更新，全程无需复制粘贴。
          </p>

          {/* 编辑表单 */}
          {formOpen && editing && (
            <div className="mb-8 space-y-4 rounded-xl border bg-card p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">标题</label>
                  <input
                    className={inputCls}
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="文章标题"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">分类</label>
                  <select
                    className={inputCls}
                    value={editing.category}
                    onChange={(e) =>
                      setEditing({ ...editing, category: e.target.value as Category })
                    }
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {categoryIcons[c]} {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">日期</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">封面 Emoji</label>
                  <input
                    className={inputCls}
                    value={editing.coverEmoji}
                    onChange={(e) => setEditing({ ...editing, coverEmoji: e.target.value })}
                    placeholder="📝"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">摘要</label>
                <textarea
                  rows={2}
                  className={inputCls}
                  value={editing.summary}
                  onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                  placeholder="一句话简介"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium">正文（空一行分段）</label>
                  <button
                    onClick={() => imgInputRef.current?.click()}
                    disabled={uploadingImg}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:opacity-80 disabled:opacity-50"
                  >
                    <ImagePlus className="h-4 w-4" /> {uploadingImg ? '上传中…' : '插入图片'}
                  </button>
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                <textarea
                  ref={contentRef}
                  rows={10}
                  className={`${inputCls} font-mono`}
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  placeholder={'第一段\n\n第二段'}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  支持 JPG / PNG / GIF / WebP，单张 ≤ 10MB，自动压缩到 1600px 宽。
                </p>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSave} className={btnPrimary}>
                  <Save className="h-4 w-4" /> 保存
                </button>
                <button onClick={closeForm} className={btnGhost}>
                  <X className="h-4 w-4" /> 取消
                </button>
              </div>
            </div>
          )}

          {/* 文章列表 */}
          <div className="space-y-3">
            {posts.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-4"
              >
                <span className="text-2xl">{p.coverEmoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.title || '（无标题）'}</div>
                  <div className="text-xs text-muted-foreground">
                    {categoryIcons[p.category]} {p.category} · {p.date}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(p)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  title="编辑"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 个人资料 */}
      {view === 'profile' && (
        <div className="space-y-4 rounded-xl border bg-card p-6">
          <p className="rounded-lg bg-accent/40 px-4 py-2 text-sm text-muted-foreground">
            这里的头像与个性签名会显示在网站首页左侧。改完点「保存」，再点顶部「发布到全网」即可更新公开站点。
          </p>

          {/* 头像预览 + 上传 */}
          <div>
            <label className="mb-2 block text-sm font-medium">头像</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-accent bg-accent/40">
                {pf.avatar ? (
                  <img src={pf.avatar} alt="头像" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl text-primary">
                    <User className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => fileRef.current?.click()} className={btnGhost}>
                  <Upload className="h-4 w-4" /> 上传图片
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarUpload}
                />
                <input
                  className={inputCls}
                  value={pf.avatar}
                  onChange={(e) => setPf({ ...pf, avatar: e.target.value })}
                  placeholder="或粘贴图片链接（https://…）"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">昵称</label>
            <input
              className={inputCls}
              value={pf.nickname}
              onChange={(e) => setPf({ ...pf, nickname: e.target.value })}
              placeholder="例如：歪歪"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">个性签名（每行一句）</label>
            <textarea
              rows={3}
              className={inputCls}
              value={pf.signature}
              onChange={(e) => setPf({ ...pf, signature: e.target.value })}
              placeholder={'爱生活，爱记录。\n美食、旅行、日常的碎碎念都收在这里。'}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={saveProfile} className={btnPrimary}>
              <Save className="h-4 w-4" /> 保存
            </button>
            <button onClick={handleResetProfile} className={btnGhost}>
              <RotateCcw className="h-4 w-4" /> 恢复默认
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
