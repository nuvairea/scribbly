import { createContext } from 'react';

export interface ActionToastOptions {
  /** Same key while visible means the toast is kept as is instead of re-shown. */
  key: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export interface ToastContextValue {
  showToast: (message: string, duration?: number) => void;
  /** Persistent toast with an action button. Stays until acted on or dismissed. */
  showActionToast: (options: ActionToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
