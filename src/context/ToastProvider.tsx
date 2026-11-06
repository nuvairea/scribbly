import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { Toast, ToastRegion } from '../components/Toast';
import { ToastContext, type ActionToastOptions } from './ToastContext';

const DEFAULT_DURATION_MS = 3000;

interface ToastState {
  id: number;
  message: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [actionToast, setActionToast] = useState<ActionToastOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nextIdRef = useRef(0);

  const showToast = useCallback((message: string, duration = DEFAULT_DURATION_MS) => {
    clearTimeout(timerRef.current);
    nextIdRef.current += 1;
    setToast({ id: nextIdRef.current, message });
    timerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const showActionToast = useCallback((options: ActionToastOptions) => {
    setActionToast((current) => (current?.key === options.key ? current : options));
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const value = useMemo(() => ({ showToast, showActionToast }), [showToast, showActionToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastRegion>
        <AnimatePresence>
          {actionToast && (
            <Toast
              key={actionToast.key}
              message={actionToast.message}
              actionLabel={actionToast.actionLabel}
              onAction={() => {
                setActionToast(null);
                actionToast.onAction();
              }}
              onDismiss={() => setActionToast(null)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence mode='wait'>{toast && <Toast key={toast.id} message={toast.message} />}</AnimatePresence>
      </ToastRegion>
    </ToastContext.Provider>
  );
}
