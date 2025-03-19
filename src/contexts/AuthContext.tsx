import { createContext, useContext, useEffect, useState } from 'react';
import { auth, type Session } from '../lib/auth';

type AuthContextType = {
  session: Session | null;
  user: Session['user'] | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Session['user'] | null>(null);

  useEffect(() => {
    // Get initial session
    const currentSession = auth.getSession();
    setSession(currentSession);
    setUser(currentSession?.user ?? null);

    // We could add WebSocket connection here for real-time auth state
    // For now, we'll just check session on focus
    const handleFocus = () => {
      const currentSession = auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const response = await auth.signUp(email, password);
      setSession(auth.getSession());
      setUser(response.user);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await auth.signIn(email, password);
      setSession(auth.getSession());
      setUser(response.user);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
