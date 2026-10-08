import styles from './Spinner.module.css';

type Props = {
  size?: number;
};

export function Spinner({ size = 17 }: Props) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} />
      ))}
    </span>
  );
}
