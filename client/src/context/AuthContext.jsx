import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('baykeep_token') || null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session from localStorage on initial page load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('baykeep_token');
      const storedUser = localStorage.getItem('baykeep_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          // Optional: Verify token with backend
          const res = await api.get('/auth/me');
          setUser(res.data.data);
          localStorage.setItem('baykeep_user', JSON.stringify(res.data.data));
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login handler
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, ...userData } = res.data.data;

    setToken(receivedToken);
    setUser(userData);
    localStorage.setItem('baykeep_token', receivedToken);
    localStorage.setItem('baykeep_user', JSON.stringify(userData));

    return userData;
  };

  // Registration handler
  const register = async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    const { token: receivedToken, ...userData } = res.data.data;

    setToken(receivedToken);
    setUser(userData);
    localStorage.setItem('baykeep_token', receivedToken);
    localStorage.setItem('baykeep_user', JSON.stringify(userData));

    return userData;
  };

  // Logout handler
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('baykeep_token');
    localStorage.removeItem('baykeep_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'admin',
        isManager: user?.role === 'admin' || user?.role === 'manager',
        login,
        register,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook for convenient consumption
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};