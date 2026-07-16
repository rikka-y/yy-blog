import { useState } from 'react';
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
} from 'lucide-react';
import type { BlogPost, Category } from '@/types/blog';
import { categories, categoryIcons } from '@/data/posts';
import { usePosts } from '@/data/PostsContext';

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

export function AdminPage() {
  const { posts, loading, addPost, updatePost, deletePost, reset } = usePosts();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string>('');

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

  const handleReset = () => {
    if (confirm('确定恢复为原始文章？（会清除你浏览器里的本地修改）')) reset();
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishMsg('');
    try {
      const res = await fetch('/api/publish', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setPublishMsg(
          data.unchanged
            ? '内容没有变化，无需发布 ✅'
            : '已推送到 GitHub，正在自动部署，稍候公开链接就会更新 🚀'
        );
      } else {
        setPublishMsg(
          '发布失败：' + (data.error || '未知错误') + '\n请确认你是通过「npm run serve」启动的本地服务。'
        );
      }
    } catch {
      setPublishMsg('发布失败：连不上本地发布服务。请确认服务在运行（npm run serve）。');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center text-muted-foreground">
        加载中…
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
          <button onClick={handleReset} className={btnGhost}>
            <RotateCcw className="h-4 w-4" /> 恢复原始
          </button>
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
            <label className="mb-1 block text-sm font-medium">正文（空一行分段）</label>
            <textarea
              rows={10}
              className={`${inputCls} font-mono`}
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder={'第一段\n\n第二段'}
            />
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
    </div>
  );
}
