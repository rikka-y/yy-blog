import { Link } from 'react-router-dom';
import type { BlogPost } from '@/types/blog';

interface PostCardProps {
  post: BlogPost;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link
      to={`/post/${post.id}`}
      className="group block rounded-xl border bg-card p-6 shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-2xl">
          {post.coverEmoji}
        </span>
        <div>
          <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {post.category}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">{post.date}</span>
        </div>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
        {post.title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
        {post.summary}
      </p>

      <div className="mt-4 flex items-center text-sm text-primary">
        <span className="group-hover:underline">阅读全文 →</span>
      </div>
    </Link>
  );
}
