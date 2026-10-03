import type { CSSProperties } from 'react';

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
  size?: number | string;
  style?: CSSProperties;
  /** Ẩn với trình đọc màn hình khi icon chỉ để trang trí cạnh chữ. */
  decorative?: boolean;
}

export function Icon({ name, filled, className = '', size, style, decorative }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      aria-hidden={decorative ? true : undefined}
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

