import { Link } from 'react-router-dom';
import { PenLine, ArrowRight, Calendar } from 'lucide-react';
import { usePosts } from '@/data/PostsContext';
import { useProfile } from '@/data/ProfileContext';
import { categories, categoryIcons } from '@/data/posts';

export function LandingPage() {
  const { posts, loading } = usePosts();
  const { profile } = useProfile();

  const countOf = (cat: string) => posts.filter((p) => p.category === cat).length;
  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-12 lg:px-12">
      <div className="grid w-full items-center gap-8 lg:grid-cols-[3fr_5fr]">
        {/* 左侧：头像 + 个性签名 */}
        <div>
          <div className="rounded-3xl border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto mb-6 h-44 w-44 overflow-hidden rounded-full border-[6px] border-accent bg-accent/40">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.nickname}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl text-primary">
                  {profile.nickname ? profile.nickname.slice(0, 1) : <PenLine className="h-12 w-12" />}
                </div>
              )}
            </div>
            <h2 className="text-3xl font-bold text-foreground">{profile.nickname || '歪歪'}</h2>
            <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
              {profile.signature}
            </p>
          </div>
        </div>

        {/* 右侧：分类模块 */}
        <div>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">分类浏览</h1>
              <p className="mt-1 text-sm text-muted-foreground">挑一个感兴趣的分类，看看里面的记录</p>
            </div>
            <Link
              to="/posts"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              全部文章 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="py-20 text-center text-muted-foreground">加载中…</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  to={`/posts?category=${encodeURIComponent(cat)}`}
                  className="group flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-3xl transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {categoryIcons[cat]}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{cat}</div>
                    <div className="text-xs text-muted-foreground">{countOf(cat)} 篇记录</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-dashed bg-accent/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              想看所有文章？点右上角「全部文章」，或直接进
              <Link to="/posts" className="mx-1 font-medium text-primary hover:underline">
                文章列表
              </Link>
              。
            </p>
          </div>

          {/* 最新文章：填充下方空白 */}
          <div className="mt-12">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-bold text-foreground">最新文章</h2>
              <Link
                to="/posts"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                查看更多 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">加载中…</div>
            ) : recentPosts.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                还没有文章，快去后台写一篇吧。
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {recentPosts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="group flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                        <span>{categoryIcons[post.category]}</span>
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {post.date}
                      </span>
                    </div>
                    <h3 className="mb-2 line-clamp-1 text-lg font-semibold text-foreground group-hover:text-primary">
                      {post.title}
                    </h3>
                    <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {post.summary}
                    </p>
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                      阅读全文 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
