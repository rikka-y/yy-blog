import { useSearchParams } from 'react-router-dom';
import { usePosts } from '@/data/PostsContext';
import { PostCard } from '@/components/PostCard';
import { Sidebar } from '@/components/Sidebar';
import { Sparkles } from 'lucide-react';

export function HomePage() {
  const [searchParams] = useSearchParams();
  const { posts, loading } = usePosts();
  const category = searchParams.get('category') || '';
  const filtered = category ? posts.filter((p) => p.category === category) : posts;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center text-muted-foreground">
        加载中…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* 顶部问候 */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">歪歪的日常记录</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          {category ? `📂 ${category}` : '生活碎片'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {category
            ? `${filtered.length} 篇${category}相关的记录`
            : '吃好吃的，去好玩的地方，读有趣的书。'}
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* 文章列表 */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <p className="text-muted-foreground">这个分类下还没有文章～</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="w-full lg:w-64 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
