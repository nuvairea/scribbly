import { Spinner } from './Spinner';
import styles from './SplashScreen.module.css';

export function SplashScreen() {
  return (
    <div className={styles.splash}>
      <div className={styles.blobYellow} />
      <div className={styles.blobBlue} />
      <div className={styles.content}>
        <div className={styles.logo}>Scribbly</div>
        <Spinner size={36} />
      </div>
    </div>
  );
}
