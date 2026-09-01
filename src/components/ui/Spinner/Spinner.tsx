import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

const STROKE = 2.5;
const VIEWBOX_WIDTH = 96;
const VIEWBOX_HEIGHT = 20;
const DOTS = [
  { cx: 28, className: styles.dot1 },
  { cx: 48, className: styles.dot2 },
  { cx: 68, className: styles.dot3 },
] as const;

export function Spinner({ size = 96, className, label = 'Loading' }: SpinnerProps) {
  const classes = [styles.spinner, className].filter(Boolean).join(' ');
  const hasLabel = Boolean(label);
  const width = size;
  const height = Math.round((size * VIEWBOX_HEIGHT) / VIEWBOX_WIDTH);

  return (
    <svg
      className={classes}
      width={width}
      height={height}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={hasLabel ? 'img' : undefined}
      aria-label={hasLabel ? label : undefined}
      aria-hidden={hasLabel ? undefined : true}
    >
      {DOTS.map(({ cx, className: dotClassName }) => (
        <circle
          key={cx}
          className={dotClassName}
          cx={cx}
          cy="10"
          r="7"
          stroke="currentColor"
          strokeWidth={STROKE}
        />
      ))}
    </svg>
  );
}
