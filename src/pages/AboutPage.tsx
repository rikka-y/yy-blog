import { Coffee, MapPin, BookOpen } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-8 text-2xl font-bold text-foreground sm:text-3xl">关于我</h1>

      {/* 头像区 */}
      <div className="mb-10 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-4xl sm:mb-0 sm:mr-6 sm:shrink-0">
          🥐
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Hi，我是歪歪</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            一个普普通通的生活记录者
          </p>
        </div>
      </div>

      {/* 介绍卡片 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">关于这个博客</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            这里是我的线上日记本。记录日常生活中的小确幸——可能是做了一顿好吃的饭，去了一座没去过的城市，读完了一本有趣的书，或者只是某个雨天的一点碎碎念。
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">喜欢的东西</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            🍜 做饭和探店 · ✈️ 周末短途旅行 · 📚 杂食性阅读 · ☕ 每天一杯咖啡 · 🌧️ 喜欢下雨天发呆
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">联系方式</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            如果你想跟我聊聊美食、旅行或者最近在读的书，欢迎在文章下面留言。
            虽然没有评论功能（暂时），但每条留言我都会看～
          </p>
        </div>
      </div>

      {/* 更新 */}
      <div className="mt-10 rounded-xl border bg-accent/30 p-5 text-center">
        <p className="text-sm text-muted-foreground">
          博客于 2026 年 7 月上线 · 不定期更新 · 感谢你来
        </p>
      </div>
    </div>
  );
}
