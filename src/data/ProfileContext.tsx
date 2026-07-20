import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { SiteProfile } from '@/types/blog';
import {
  fetchBaseProfile,
  loadProfileFromStorage,
  saveProfileToStorage,
  clearProfileStorage,
  DEFAULT_PROFILE,
} from './profile';

interface ProfileContextValue {
  profile: SiteProfile;
  loading: boolean;
  updateProfile: (p: SiteProfile) => void;
  reset: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SiteProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = await fetchBaseProfile();
        if (cancelled) return;
        setProfile(base);
      } catch {
        if (!cancelled) setProfile(loadProfileFromStorage() ?? DEFAULT_PROFILE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 优先写入本地服务（落到 public/profile.json，由 git 跟踪）；
  // 若服务不可用则回退到 localStorage。
  const updateProfile = useCallback((next: SiteProfile) => {
    setProfile(next);
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
      .then((r) => {
        if (!r.ok) saveProfileToStorage(next);
      })
      .catch(() => saveProfileToStorage(next));
  }, []);

  const reset = useCallback(() => {
    clearProfileStorage();
    fetchBaseProfile()
      .then((base) => {
        setProfile(base);
        fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(base),
        }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, updateProfile, reset }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile 必须在 ProfileProvider 内使用');
  return ctx;
}
