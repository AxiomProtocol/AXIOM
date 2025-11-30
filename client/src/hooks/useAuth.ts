import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  accountStatus: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('auth_token'),
    loading: true,
    error: null
  });

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyToken(token);
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Verify token with backend
  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setAuthState({
          user: userData.user,
          token,
          loading: false,
          error: null
        });
      } else {
        // Token invalid, remove it
        localStorage.removeItem('auth_token');
        setAuthState({
          user: null,
          token: null,
          loading: false,
          error: 'Session expired'
        });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
      setAuthState({
        user: null,
        token: null,
        loading: false,
        error: 'Authentication failed'
      });
    }
  };

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('auth_token', data.token);
        setAuthState({
          user: data.user,
          token: data.token,
          loading: false,
          error: null
        });
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Login failed'
        }));
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Network error during login'
      }));
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('auth_token');
    setAuthState({
      user: null,
      token: null,
      loading: false,
      error: null
    });
  };

  // Check if user is admin
  const isAdmin = () => {
    return authState.user?.role === 'admin' || authState.user?.role === 'super_admin';
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!authState.user && !!authState.token;
  };

  return {
    user: authState.user,
    token: authState.token,
    loading: authState.loading,
    error: authState.error,
    login,
    logout,
    isAdmin,
    isAuthenticated
  };
}
