// context/AuthContext.jsx
//
// Holds the logged-in user's info across the whole app. On first load, it
// checks localStorage for a saved token/user (so refreshing the page
// doesn't log you out), then exposes login/register/logout functions to
// any component via useAuth().

import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("grampulse_user");
    const savedToken = localStorage.getItem("grampulse_token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  function persistSession(token, userData) {
    localStorage.setItem("grampulse_token", token);
    localStorage.setItem("grampulse_user", JSON.stringify(userData));
    setUser(userData);
  }

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    persistSession(res.data.token, res.data.user);
    return res.data.user;
  }

  async function register(fields) {
    const res = await api.post("/auth/register", fields);
    persistSession(res.data.token, res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem("grampulse_token");
    localStorage.removeItem("grampulse_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
