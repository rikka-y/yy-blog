import type { SiteProfile } from '@/types/blog';

export const PROFILE_STORAGE_KEY = 'waiwai-profile';

export const DEFAULT_PROFILE: SiteProfile = {
  nickname: '歪歪',
  signature: '爱生活，爱记录。',
  avatar: '',
};

export async function fetchBaseProfile(): Promise<SiteProfile> {
  const url = import.meta.env.BASE_URL + 'profile.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('加载资料失败');
  return (await res.json()) as SiteProfile;
}

export function loadProfileFromStorage(): SiteProfile | null {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SiteProfile;
  } catch {
    return null;
  }
}

export function saveProfileToStorage(p: SiteProfile): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
}

export function clearProfileStorage(): void {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}
