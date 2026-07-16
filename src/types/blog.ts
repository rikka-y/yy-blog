export type Category = '美食' | '旅行' | '日常' | '阅读' | '随笔';

export interface BlogPost {
  id: string;
  title: string;
  category: Category;
  date: string; // YYYY-MM-DD
  summary: string;
  content: string;
  coverEmoji: string;
}
