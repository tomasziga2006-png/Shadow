import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar_url: string | null;
}

interface DiscordAuthValue {
  user: DiscordUser | null;
  ready: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const DiscordAuthContext = createContext<DiscordAuthValue>({
  user: null, ready: false, login: () => {}, logout: async () => {},
});

export function DiscordAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/auth/discord/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (res) => res.ok ? (await res.json()).user as DiscordUser : null)
      .then((next) => { if (active) setUser(next); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const login = useCallback(() => {
    window.location.assign('/api/auth/discord/start');
  }, []);
  const logout = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/discord/logout', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) throw new Error('Logout request failed');
      setUser(null);
    } catch {
      window.location.reload();
    }
  }, []);
  return (
    <DiscordAuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </DiscordAuthContext.Provider>
  );
}

export function useDiscordAuth() {
  return useContext(DiscordAuthContext);
}
