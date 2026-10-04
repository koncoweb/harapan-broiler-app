// src/hooks/useUserRole.ts
// Resolves the signed-in user's role from Turso (via authService), replacing the
// Firebase Auth + Firestore `users/{uid}` lookup.
import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, refreshCurrentUser, AuthUser } from '../services/authService';

export const useUserRole = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const fresh = await refreshCurrentUser();
      const current = fresh ?? (await getCurrentUser());
      setUser(current);
      setRole(current ? current.role : null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { user, role, loading, isAdmin: role === 'admin', refresh: load };
};
