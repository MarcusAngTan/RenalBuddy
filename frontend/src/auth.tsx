import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken } from "./api";
import type { TokenResponse, User } from "./types";

type AuthValue = {
  user: User | null;
  loading: boolean;
  signIn: (session: TokenResponse) => void;
  signOut: () => void;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("renalbuddy_token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    const onExpired = () => {
      setTokenState(null);
      setUser(null);
    };
    window.addEventListener("renalbuddy-auth", onExpired);
    return () => window.removeEventListener("renalbuddy-auth", onExpired);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    api<User>("/api/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null);
          setTokenState(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function signIn(session: TokenResponse) {
    setToken(session.access_token);
    setTokenState(session.access_token);
    setUser(session.user);
    setLoading(false);
  }

  function signOut() {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }

  async function refreshUser() {
    const me = await api<User>("/api/auth/me");
    setUser(me);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing.");
  return value;
}
