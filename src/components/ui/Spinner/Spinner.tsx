import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

/**
 * Heart geometry authored at 4× (large pulse state).
 * Animation scales to 0.5 for the 2× (small) state — viewBox fits the 4× bounds.
 */
const R = 14;
const TIP_Y = R * 2.2;
const PAD = 2;
/** Diameter line Y; peak at HEART_Y - R stays inside the viewBox. */
const HEART_Y = R + PAD;
const VIEWBOX_WIDTH = 200;
const VIEWBOX_HEIGHT = Math.ceil(HEART_Y + TIP_Y + PAD);

function HeartShape() {
  const left = -2 * R;
  const mid = 0;
  const right = 2 * R;
  const leftLobe = `M ${left} 0 A ${R} ${R} 0 0 1 ${-R} ${-R} A ${R} ${R} 0 0 1 ${mid} 0 Z`;
  const rightLobe = `M ${mid} 0 A ${R} ${R} 0 0 1 ${R} ${-R} A ${R} ${R} 0 0 1 ${right} 0 Z`;
  return (
    <>
      <path d={leftLobe} fill="currentColor" />
      <path d={rightLobe} fill="currentColor" />
      <polygon points={`${left},-1 ${right},-1 0,${TIP_Y - 1}`} fill="currentColor" />
    </>
  );
}

const HEARTS = [
  { x: 50, className: styles.heart1 },
  { x: 100, className: styles.heart2 },
  { x: 150, className: styles.heart3 },
] as const;

export function Spinner({ size = VIEWBOX_WIDTH, className, label = 'Loading' }: SpinnerProps) {
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
      overflow="visible"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={hasLabel ? 'img' : undefined}
      aria-label={hasLabel ? label : undefined}
      aria-hidden={hasLabel ? undefined : true}
    >
      {HEARTS.map(({ x, className: heartClassName }) => (
        <g key={x} transform={`translate(${x} ${HEART_Y})`}>
          <g className={heartClassName}>
            <HeartShape />
          </g>
        </g>
      ))}
    </svg>
  );
}
