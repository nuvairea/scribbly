import { useState } from 'react';
import styles from './AuthModal.module.css';
import { useGoogleLogin } from '@react-oauth/google';
import GoogleIcon from '../assets/google-icon.png';
import { Spinner } from './Spinner';

type Props = {
  onGuest: () => void;
  onGoogle: (code: string) => Promise<void> | void;
};

export function AuthModal({ onGuest, onGoogle }: Props) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'openid email profile',
    onSuccess: async ({ code }) => {
      try {
        await onGoogle(code);
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setIsGoogleLoading(false);
      console.error('Google sign-in failed');
    },
    onNonOAuthError: () => {
      setIsGoogleLoading(false);
      console.error('Google sign-in could not be completed');
    },
  });

  return (
    <div className={styles.screen}>
      <div className={styles.blobYellow} />
      <div className={styles.blobBlue} />
      <div className={styles.content}>
        <div className={styles.logo}>Scribbly</div>
        <p className={styles.tagline}>A space for notes, thoughts, and scribbles.</p>
        <button
          className={styles.googleBtn}
          onClick={() => {
            setIsGoogleLoading(true);
            login();
          }}
          disabled={isGoogleLoading}
          aria-busy={isGoogleLoading}
        >
          {isGoogleLoading ? <Spinner /> : <img src={GoogleIcon} width={33} height={33} alt='' />}
          {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
        </button>
        <button className={styles.guestBtn} onClick={onGuest}>
          Continue as guest
        </button>
      </div>
    </div>
  );
}
