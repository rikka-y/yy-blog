import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { BlogPost } from '@/types/blog';
import { fetchBasePosts, loadFromStorage, saveToStorage, clearStorage } from './posts';

interface PostsContextValue {
  posts: BlogPost[];
  loading: boolean;
  getPost: (id: string) => BlogPost | undefined;
  addPost: (post: BlogPost) => void;
  updatePost: (post: BlogPost) => void;
  deletePost: (id: string) => void;
  reset: () => void;
}

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = await fetchBasePosts();
        if (cancelled) return;
        setPosts(base);
      } catch {
        if (!cancelled) setPosts(loadFromStorage() ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 优先写入本地服务（直接落到 public/posts.json 由 git 跟踪）；
  // 若服务不可用则回退到 localStorage，避免编辑丢失。
  const persist = useCallback((next: BlogPost[]) => {
    setPosts(next);
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
      .then((r) => {
        if (!r.ok) saveToStorage(next);
      })
      .catch(() => saveToStorage(next));
  }, []);

  const getPost = useCallback((id: string) => posts.find((p) => p.id === id), [posts]);

  const addPost = useCallback(
    (post: BlogPost) => persist([post, ...posts]),
    [posts, persist],
  );

  const updatePost = useCallback(
    (post: BlogPost) => persist(posts.map((p) => (p.id === post.id ? post : p))),
    [posts, persist],
  );

  const deletePost = useCallback(
    (id: string) => persist(posts.filter((p) => p.id !== id)),
    [posts, persist],
  );

  const reset = useCallback(() => {
    clearStorage();
    fetchBasePosts()
      .then((base) => {
        setPosts(base);
        fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(base),
        }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  return (
    <PostsContext.Provider
      value={{ posts, loading, getPost, addPost, updatePost, deletePost, reset }}
    >
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error('usePosts 必须在 PostsProvider 内使用');
  return ctx;
}
