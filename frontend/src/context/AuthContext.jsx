import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, full_name, role, ... }
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(true);

  // Restore session on first load: /api/auth/me resolves the httpOnly cookie.
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const me = await api.get('/api/auth/me');
        if (!mounted) return;
        setUser(me);
        setRole(me.role || 'student');
      } catch {
        if (!mounted) return;
        setUser(null);
        setRole('student');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();
    return () => {
      mounted = false;
    };
  }, []);

  function applyUser(me) {
    setUser(me);
    setRole(me?.role || 'student');
  }

  async function signIn(email, password) {
    try {
      await api.post('/api/auth/login', { email, password });
      const me = await api.get('/api/auth/me');
      applyUser(me);
      return { error: null, user: me };
    } catch (err) {
      applyUser(null);
      return { error: err, user: null };
    }
  }

  async function signUp(name, email, password, role = 'student') {
    try {
      await api.post('/api/auth/register', { email, password, full_name: name, role });
    } catch (err) {
      // Registration never happened — surface the real failure.
      return { error: err, data: null, user: null };
    }

    // Registration succeeded; try to sign the user in right away. A transient
    // failure here (network blip) must NOT be reported as a failed signup —
    // the account genuinely exists, so steer the user toward signing in.
    const login = await signIn(email, password);
    if (login.error) {
      return {
        error: null,
        data: { accountCreated: true, hint: 'Account created. Please sign in.' },
        user: null,
      };
    }
    return { error: null, data: null, user: login.user };
  }

  async function signOut() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Even if the server is unreachable, clear local state.
    }
    applyUser(null);
  }

  async function refreshUser() {
    try {
      const me = await api.get('/api/auth/me');
      applyUser(me);
      return me;
    } catch (err) {
      // Session expired or the request failed — drop local state rather than
      // leaking an unhandled rejection that could crash the app.
      applyUser(null);
      throw err;
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}