import styles from './AuthModal.module.css';
import { useGoogleLogin } from '@react-oauth/google';
import GoogleIcon from '../assets/google-icon.png';

type Props = {
  onGuest: () => void;
  onGoogle: (code: string) => void;
};

export function AuthModal({ onGuest, onGoogle }: Props) {
  const login = useGoogleLogin({
    flow: 'auth-code',
    scope: 'openid email profile',
    onSuccess: ({ code }) => onGoogle(code),
    onError: () => console.error('Google sign-in failed'),
  });

  return (
    <div className={styles.screen}>
      <div className={styles.blobYellow} />
      <div className={styles.blobBlue} />
      <div className={styles.content}>
        <div className={styles.logo}>Scribbly</div>
        <p className={styles.tagline}>A space for notes, thoughts, and scribbles.</p>
        <button className={styles.googleBtn} onClick={() => login()}>
          <img src={GoogleIcon} width={33} height={33} alt='' />
          Continue with Google
        </button>
        <button className={styles.guestBtn} onClick={onGuest}>
          Continue as guest
        </button>
      </div>
    </div>
  );
}
