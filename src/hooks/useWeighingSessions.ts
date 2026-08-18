// src/hooks/useWeighingSessions.ts
import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { WeighingSession } from '../types';

interface UseWeighingSessionsOptions {
  onError?: (error: Error) => void;
}

export const useWeighingSessions = (options?: UseWeighingSessionsOptions) => {
  const [sessions, setSessions] = useState<WeighingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'weighing_sessions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: WeighingSession[] = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        } as WeighingSession));
        setSessions(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching weighing sessions:', err);
        setError(err as Error);
        setLoading(false);
        options?.onError?.(err as Error);
      }
    );

    return () => unsubscribe();
  }, [options?.onError]);

  return { sessions, loading, error };
};
