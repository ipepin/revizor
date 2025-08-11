import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUser } from "../api/auth";
// ⬇️ User je jen typ
import type { User } from "../api/auth";

// ⬇️ getCurrentUser je runtime export
// ⬇️ User je jen typ


type UserContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
  login: (u: User) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  login: () => {},
  logout: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const session = localStorage.getItem("session");
      if (session) {
        const parsed = JSON.parse(session);
        const age = Date.now() - parsed.timestamp;
        if (age < 1000 * 60 * 30) {
          setUser(parsed.user);
        } else {
          localStorage.removeItem("session");
        }
      }
    } catch {
      localStorage.removeItem("session");
    }
  }, []);

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem("session", JSON.stringify({ user: u, timestamp: Date.now() }));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("session");
  };

  return (
    <UserContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
