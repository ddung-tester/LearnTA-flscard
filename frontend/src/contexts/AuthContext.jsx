import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AUTH_TOKEN_STORAGE_KEY } from "../services/api";
import {
  dangKyTaiKhoan,
  dangNhapTaiKhoan,
  layNguoiDungHienTai,
} from "../services/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  );
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const saveAuth = useCallback((data) => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsAuthReady(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      if (!token) {
        setUser(null);
        setIsAuthReady(true);
        return;
      }

      setIsAuthReady(false);

      try {
        const currentUser = await layNguoiDungHienTai();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const dangNhap = useCallback(
    async (payload) => {
      const data = await dangNhapTaiKhoan(payload);
      saveAuth(data);
      return data.user;
    },
    [saveAuth]
  );

  const dangKy = useCallback(
    async (payload) => {
      const data = await dangKyTaiKhoan(payload);
      return data.user;
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthReady,
      isAuthenticated: Boolean(token && user),
      dangNhap,
      dangKy,
      dangXuat: clearAuth,
    }),
    [clearAuth, dangKy, dangNhap, isAuthReady, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phai duoc dung trong AuthProvider");
  }

  return context;
}
