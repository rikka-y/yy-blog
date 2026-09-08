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
  siteName: string; // 网站名称，如「歪歪的日常」
  footerText: string; // 页脚文案，如「记录生活的小确幸」
  homeHint: string; // 首页分类区下方提示文字
}
