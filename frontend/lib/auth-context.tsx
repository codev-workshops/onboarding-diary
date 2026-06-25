"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  getRefreshToken,
  setAccessToken,
  clearTokens,
  ping,
  type UserDto,
  type LoginRequest,
} from "./api";

interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (req: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function tryRestoreSession(): Promise<UserDto | null> {
  const rt = getRefreshToken();
  if (!rt) return null;

  try {
    const data = await ping({ suppressRedirect: true });
    return {
      id: data.userId,
      role: data.role,
      email: "",
      name: "",
      department: "",
      startDate: "",
      avatarUrl: null,
      managerId: null,
      isActive: true,
    };
  } catch {
    clearTokens();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cancelled = false;

    tryRestoreSession().then((restoredUser) => {
      if (cancelled) return;
      if (restoredUser) setUser(restoredUser);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const loginHandler = useCallback(async (req: LoginRequest) => {
    const res = await apiLogin(req);
    setUser(res.user);
  }, []);

  const logoutHandler = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login: loginHandler,
        logout: logoutHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
