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

export interface SiteProfile {
  nickname: string;
  signature: string;
  avatar: string; // 图片 URL 或 data URI，留空则用默认头像
}
