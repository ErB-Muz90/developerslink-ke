import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ActiveUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: string;
}

interface UserContextValue {
  currentUser: ActiveUser | null;
  setCurrentUser: (user: ActiveUser | null) => void;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  setCurrentUser: () => {},
});

const STORAGE_KEY = "devlink_ke_current_user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<ActiveUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setCurrentUser = (user: ActiveUser | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
