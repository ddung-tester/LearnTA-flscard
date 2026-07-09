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
  dangNhapGoogle,
  layNguoiDungHienTai,
} from "../services/authApi";
import { dongBoCaiDatTuDatabase } from "../utils/caiDatHocTap";
import { dongBoDuLieuHocTapLenBackend } from "../utils/learningSync";

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
    dongBoCaiDatTuDatabase();
    dongBoDuLieuHocTapLenBackend();
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
          dongBoCaiDatTuDatabase();
          dongBoDuLieuHocTapLenBackend();
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

  const dangNhapViaGoogle = useCallback(
    async (idToken) => {
      const data = await dangNhapGoogle(idToken);
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
      dangNhapViaGoogle,
      dangKy,
      dangXuat: clearAuth,
    }),
    [clearAuth, dangKy, dangNhap, dangNhapViaGoogle, isAuthReady, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { // eslint-disable-line react-refresh/only-export-components
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phai duoc dung trong AuthProvider");
  }

  return context;
}
