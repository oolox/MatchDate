import styles from './Icon.module.css';
import { iconSources, type IconName } from './icons';

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  label?: string;
}

function renderSvg(name: IconName, size: number): string {
  return iconSources[name].replace('<svg ', `<svg width="${size}" height="${size}" `);
}

export function Icon({ name, size = 20, className, label }: IconProps) {
  const svg = renderSvg(name, size);
  const classes = [styles.wrapper, className].filter(Boolean).join(' ');

  if (label) {
    return (
      <span className={classes} role="img" aria-label={label}>
        <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
      </span>
    );
  }

  return (
    <span
      className={classes}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
