import { useSearchParams } from 'react-router-dom';
import { categories, categoryIcons } from '@/data/posts';
import { usePosts } from '@/data/PostsContext';

export function Sidebar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { posts } = usePosts();
  const activeCategory = searchParams.get('category') || '';

  const handleCategoryClick = (cat: string) => {
    if (activeCategory === cat) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', cat);
    }
    setSearchParams(searchParams);
  };

  return (
    <aside className="space-y-6">
      {/* 分类 */}
      <div className="rounded-xl border bg-card p-5">
        <h4 className="mb-4 text-sm font-semibold text-foreground">📂 分类</h4>
        <div className="space-y-1">
          <button
            onClick={() => {
              searchParams.delete('category');
              setSearchParams(searchParams);
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !activeCategory
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50'
            }`}
          >
            全部文章
            <span className="float-right text-xs text-muted-foreground">{posts.length}</span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeCategory === cat
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50'
              }`}
            >
              {categoryIcons[cat]} {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 关于 */}
      <div className="rounded-xl border bg-card p-5">
        <h4 className="mb-3 text-sm font-semibold text-foreground">👋 关于我</h4>
        <p className="text-sm leading-relaxed text-muted-foreground">
          一个喜欢记录生活的普通人。
          <br />
          吃好吃的，去好玩的地方，读有趣的书。
          <br />
          这里是我的日常碎片。
        </p>
      </div>
    </aside>
  );
}
