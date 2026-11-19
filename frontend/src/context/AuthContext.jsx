import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("civicfix_user"));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("civicfix_token") || null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("civicfix_user", JSON.stringify(data.user));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (email, password, expectedRole) => {
    const { data } = await api.post("/auth/login", { email, password, expectedRole });
    localStorage.setItem("civicfix_token", data.token);
    localStorage.setItem("civicfix_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("civicfix_token", data.token);
    localStorage.setItem("civicfix_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("civicfix_token");
    localStorage.removeItem("civicfix_user");
    setToken(null);
    setUser(null);
  }, []);

  const setProfile = useCallback((u) => {
    setUser(u);
    localStorage.setItem("civicfix_user", JSON.stringify(u));
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    setProfile,
    isAdmin: Boolean(user && user.role === "ADMIN"),
    isEngineer: Boolean(user && user.role === "ENGINEER"),
    isUser: Boolean(user && user.role === "USER"),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);