
"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { getFirebase, getUserDb as getDb } from '@/lib/firebase';
import type { Firestore } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  db: Firestore | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, db: null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialAuthCheck, setInitialAuthCheck] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const { auth } = getFirebase();
    if (!auth) {
      console.error("Auth service is not available.");
      setLoading(false); // Stop loading if auth is not available
      setInitialAuthCheck(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userDb = await getDb();
        setDb(userDb);
      } else {
        setDb(null);
      }
      setLoading(false);
      setInitialAuthCheck(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && initialAuthCheck) {
      const isAuthPage = pathname === '/dashboard';
      // If user is logged in, and they are on the sign-in page, redirect them.
      if (user && isAuthPage) {
        router.push('/dashboard/overview');
      }
      // If user is not logged in, and they are trying to access a protected dashboard page, redirect them.
      else if (!user && pathname.startsWith('/dashboard') && !isAuthPage) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, initialAuthCheck, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, db }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
