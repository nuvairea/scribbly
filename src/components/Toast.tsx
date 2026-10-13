import { motion } from 'motion/react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className={styles.region}>
      <motion.div
        className={styles.toast}
        role='status'
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {message}
      </motion.div>
    </div>
  );
}
