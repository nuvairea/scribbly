import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { Toast } from '../components/Toast';
import { ToastContext } from './ToastContext';

const DEFAULT_DURATION_MS = 3000;

interface ToastState {
  id: number;
  message: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nextIdRef = useRef(0);

  const showToast = useCallback((message: string, duration = DEFAULT_DURATION_MS) => {
    clearTimeout(timerRef.current);
    nextIdRef.current += 1;
    setToast({ id: nextIdRef.current, message });
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <AnimatePresence mode='wait'>
        {toast && <Toast key={toast.id} message={toast.message} />}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}
