import { Icon } from './Icon';

const GRID_SIZE = 11;
const CELL = 8;

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isFinderCell(row: number, col: number): boolean {
  const corners: Array<[number, number]> = [
    [0, 0],
    [0, GRID_SIZE - 3],
    [GRID_SIZE - 3, 0],
  ];
  return corners.some(([r, c]) => row >= r && row < r + 3 && col >= c && col < c + 3);
}

interface MockPaymentQrProps {
  accountName: string;
}

export function MockPaymentQr({ accountName }: MockPaymentQrProps) {
  const random = mulberry32(hashSeed(accountName));
  const size = GRID_SIZE * CELL;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Mã QR minh hoạ, không dùng để thanh toán thật"
        style={{ borderRadius: 'var(--radius-sm)', background: '#fff', flexShrink: 0 }}
      >
        {Array.from({ length: GRID_SIZE }).map((_, row) =>
          Array.from({ length: GRID_SIZE }).map((_, col) => {
            const filled = isFinderCell(row, col) ? true : random() > 0.55;
            if (!filled) return null;
            return (
              <rect
                key={`${row}-${col}`}
                x={col * CELL}
                y={row * CELL}
                width={CELL}
                height={CELL}
                fill="#14261a"
              />
            );
          }),
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="text-label-sm" style={{ fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="qr_code_2" size={16} />
          Mã QR minh hoạ
        </span>
        <span className="text-label-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Dữ liệu demo, chưa liên kết cổng thanh toán thật.
        </span>
      </div>
    </div>
  );
}
