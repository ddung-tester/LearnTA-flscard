import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  storeAuthToken,
} from "../services/api";
import {
  dangKyTaiKhoan,
  dangNhapTaiKhoan,
  dangNhapGoogle,
  layNguoiDungHienTai,
} from "../services/authApi";
import { dongBoCaiDatTuDatabase } from "../utils/caiDatHocTap";
import { dongBoDuLieuHocTapLenBackend } from "../utils/learningSync";
import { chonKhoHocTap } from "../utils/khoHocTap";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredAuthToken());
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [authRetry, setAuthRetry] = useState(0);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const saveAuth = useCallback((data) => {
    storeAuthToken(data.token);
    chonKhoHocTap(data.user.id);
    setToken(data.token);
    setUser(data.user);
    dongBoCaiDatTuDatabase();
    dongBoDuLieuHocTapLenBackend();
  }, []);

  const clearAuth = useCallback(() => {
    clearStoredAuthToken();
    // Về kho khách: không đọc tiếp cài đặt/tiến độ của tài khoản vừa thoát
    chonKhoHocTap(null);
    setToken(null);
    setUser(null);
    setIsAuthReady(true);
    setAuthError("");
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
      setAuthError("");

      try {
        const currentUser = await layNguoiDungHienTai();
        if (isMounted && token === getStoredAuthToken()) {
          chonKhoHocTap(currentUser.id);
          setUser(currentUser);
          dongBoCaiDatTuDatabase();
          dongBoDuLieuHocTapLenBackend();
        }
      } catch (error) {
        if (isMounted && token === getStoredAuthToken()) {
          if (error.status === 401) clearStoredAuthToken();
          else setAuthError(error.message);
          setToken(getStoredAuthToken());
          setUser(null);
        }
      } finally {
        if (isMounted && token === getStoredAuthToken()) {
          setIsAuthReady(true);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [token, authRetry]);

  useEffect(() => {
    function handleUnauthorized() {
      clearAuth();
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    function handleChanged() {
      setToken(getStoredAuthToken());
      setUser(null);
      setAuthError("");
      setIsAuthReady(!getStoredAuthToken());
    }
    window.addEventListener("auth:changed", handleChanged);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("auth:changed", handleChanged);
    };
  }, [clearAuth]);

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
      authError,
      retryAuth: () => setAuthRetry((lan) => lan + 1),
      isAuthenticated: Boolean(token && user),
      dangNhap,
      dangNhapViaGoogle,
      dangKy,
      dangXuat: clearAuth,
    }),
    [clearAuth, dangKy, dangNhap, dangNhapViaGoogle, isAuthReady, token, user, authError]
  );

  return <AuthContext.Provider key={token || "guest"} value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { // eslint-disable-line react-refresh/only-export-components
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phai duoc dung trong AuthProvider");
  }

  return context;
}
