import { useSearchParams } from 'react-router-dom';
import { usePosts } from '@/data/PostsContext';
import { PostCard } from '@/components/PostCard';
import { Sparkles } from 'lucide-react';
import { categories, categoryIcons } from '@/data/posts';

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { posts, loading } = usePosts();
  const category = searchParams.get('category') || '';
  const filtered = category ? posts.filter((p) => p.category === category) : posts;

  const setCategory = (cat: string) => {
    if (cat) searchParams.set('category', cat);
    else searchParams.delete('category');
    setSearchParams(searchParams);
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
      {/* 顶部标题 + 分类筛选 */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">歪歪的日常记录</span>
        </div>
        <h1 className="mb-4 text-3xl font-bold text-foreground">
          {category ? `📂 ${category}` : '生活碎片'}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('')}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              !category
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-accent'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                category === cat
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              {categoryIcons[cat]} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 文章列表 */}
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
  );
}
