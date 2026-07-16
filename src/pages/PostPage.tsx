import { useParams, Link } from 'react-router-dom';
import { usePosts } from '@/data/PostsContext';
import { ArrowLeft, Calendar } from 'lucide-react';
import { categoryIcons } from '@/data/posts';

export function PostPage() {
  const { id } = useParams<{ id: string }>();
  const { getPost, loading } = usePosts();
  const post = getPost(id || '');

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center text-muted-foreground">
        加载中…
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="text-lg text-muted-foreground mb-4">文章找不到了 😅</p>
        <Link to="/" className="text-sm text-primary hover:underline">
          ← 回首页
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      {/* 返回 */}
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        返回首页
      </Link>

      {/* 文章头 */}
      <header className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-3xl">
            {post.coverEmoji}
          </span>
          <div>
            <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              {categoryIcons[post.category]} {post.category}
            </span>
          </div>
        </div>

        <h1 className="mb-3 text-2xl font-bold leading-snug text-foreground sm:text-3xl">
          {post.title}
        </h1>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{post.date}</span>
        </div>
      </header>

      {/* 分割线 */}
      <div className="mb-8 h-px bg-border" />

      {/* 正文 */}
      <div className="blog-content text-base">
        {post.content.split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph.trim()}</p>
        ))}
      </div>

      {/* 底部导航 */}
      <div className="mt-12 border-t pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页看更多
        </Link>
      </div>
    </article>
  );
}
