import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import styles from './Toast.module.css';

export function ToastRegion({ children }: { children: ReactNode }) {
  return <div className={styles.region}>{children}</div>;
}

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function Toast({ message, actionLabel, onAction, onDismiss }: ToastProps) {
  const interactive = Boolean(actionLabel && onAction);

  return (
    <motion.div
      className={`${styles.toast} ${interactive ? styles.interactive : ''}`}
      role='status'
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <span className={styles.message}>{message}</span>
      {interactive && (
        <>
          <button type='button' className={styles.action} onClick={onAction}>
            {actionLabel}
          </button>
          {onDismiss && (
            <button type='button' className={styles.dismiss} onClick={onDismiss} aria-label='Dismiss'>
              <X size={16} />
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
