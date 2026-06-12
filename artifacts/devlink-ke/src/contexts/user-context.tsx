import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ActiveUser {
  id: number;
  username: string;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  level: string;
}

interface UserContextValue {
  currentUser: ActiveUser | null;
  isLoading: boolean;
  setCurrentUser: (user: ActiveUser | null) => void;
  refetchMe: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  isLoading: true,
  setCurrentUser: () => {},
  refetchMe: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<ActiveUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const user = await res.json();
        setCurrentUserState(user);
      } else {
        setCurrentUserState(null);
      }
    } catch {
      setCurrentUserState(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const setCurrentUser = (user: ActiveUser | null) => {
    setCurrentUserState(user);
  };

  const refetchMe = async () => {
    setIsLoading(true);
    await fetchMe();
  };

  return (
    <UserContext.Provider value={{ currentUser, isLoading, setCurrentUser, refetchMe }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
