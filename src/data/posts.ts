import type { BlogPost } from '@/types/blog';

export const STORAGE_KEY = 'waiwai-posts';

export const categories = ['美食', '旅行', '日常', '阅读', '随笔'] as const;

export const categoryIcons: Record<string, string> = {
  '美食': '🍜',
  '旅行': '✈️',
  '日常': '📝',
  '阅读': '📚',
  '随笔': '✍️',
};

export async function fetchBasePosts(): Promise<BlogPost[]> {
  const url = import.meta.env.BASE_URL + 'posts.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('加载文章失败');
  return (await res.json()) as BlogPost[];
}

export function loadFromStorage(): BlogPost[] | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BlogPost[];
  } catch {
    return null;
  }
}

export function saveToStorage(posts: BlogPost[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
