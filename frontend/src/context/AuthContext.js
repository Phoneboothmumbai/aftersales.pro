import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const [userRes, tenantRes] = await Promise.all([
        axios.get(`${API}/auth/me`),
        axios.get(`${API}/tenants/me`),
      ]);
      setUser(userRes.data);
      setTenant(tenantRes.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, subdomain) => {
    const response = await axios.post(`${API}/auth/login`, {
      email,
      password,
      subdomain,
    });
    const { token: newToken, user: userData, tenant: tenantData } = response.data;
    localStorage.setItem("token", newToken);
    localStorage.setItem("subdomain", subdomain);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    setTenant(tenantData);
    return response.data;
  };

  const signup = async (data) => {
    const response = await axios.post(`${API}/tenants/signup`, data);
    const { token: newToken, user: userData, tenant: tenantData } = response.data;
    localStorage.setItem("token", newToken);
    localStorage.setItem("subdomain", data.subdomain);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);
    setTenant(tenantData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("subdomain");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    setTenant(null);
  };

  const updateTenant = (newTenant) => {
    setTenant(newTenant);
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        loading,
        login,
        signup,
        logout,
        updateTenant,
        isAdmin,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
