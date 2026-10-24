import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('baykeep_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('baykeep_token');
      const storedUser = localStorage.getItem('baykeep_user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          const res = await api.get('/auth/me');
          setUser(res.data.data);
          localStorage.setItem('baykeep_user', JSON.stringify(res.data.data));
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, ...userData } = res.data.data;

    setToken(receivedToken);
    setUser(userData);
    localStorage.setItem('baykeep_token', receivedToken);
    localStorage.setItem('baykeep_user', JSON.stringify(userData));

    return userData;
  };

  const register = async (name, email, password, role, adminEmail) => {
    const res = await api.post('/auth/register', {
      name,
      email,
      password,
      role,
      adminEmail,
    });

    // If Staff or Manager registered, they must wait for Admin approval
    if (res.data.pendingApproval) {
      return {
        pendingApproval: true,
        message: res.data.message,
      };
    }

    const { token: receivedToken, ...userData } = res.data.data;
    setToken(receivedToken);
    setUser(userData);
    localStorage.setItem('baykeep_token', receivedToken);
    localStorage.setItem('baykeep_user', JSON.stringify(userData));

    return userData;
  };

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};