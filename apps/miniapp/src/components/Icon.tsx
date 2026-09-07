import type { CSSProperties } from 'react';

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
  size?: number | string;
  style?: CSSProperties;
}

export function Icon({ name, filled, className = '', size, style }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: filled ? "'FILL' 1" : undefined,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

