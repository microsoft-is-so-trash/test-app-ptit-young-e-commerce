import { DEFAULT_DENSITY_KG_PER_LITER } from '@eco-oil/shared-types';
import { parseLocalizedDecimal } from './collection-entry-validation';

export type MassField = 'kg' | 'liters';

/** Ô người dùng vừa nhập là ô gốc; ô còn lại tự tính theo mật độ dầu (U8). */
export interface MassEntryState {
  source: MassField | null;
  sourceText: string;
}

export const EMPTY_MASS_ENTRY: MassEntryState = { source: null, sourceText: '' };

export function editMassField(_state: MassEntryState, field: MassField, text: string): MassEntryState {
  return { source: field, sourceText: text };
}

export interface MassEntryView {
  kgText: string;
  litersText: string;
  kgAuto: boolean;
  litersAuto: boolean;
  /** Có số kg người dùng nhập (số cân thật); chỉ khi đó mới gửi actual_kg. */
  hasKilograms: boolean;
  /** Có số lít người dùng nhập; chỉ khi đó mới gửi actual_liters. */
  hasLiters: boolean;
  /** Giá trị nhập ở ô gốc; null nếu trống, NaN nếu không hợp lệ. */
  actualKg: number | null;
  enteredLiters: number | null;
  /** Số lít dùng để kiểm tra dung tích: nhập trực tiếp hoặc suy ra từ kg. */
  actualLiters: number;
}

function isPositive(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > 0;
}

export function massEntryView(state: MassEntryState, density: number = DEFAULT_DENSITY_KG_PER_LITER): MassEntryView {
  const value = parseLocalizedDecimal(state.sourceText);
  const valid = isPositive(value);
  if (state.source === 'kg') {
    return {
      kgText: state.sourceText,
      litersText: valid ? (value / density).toFixed(1) : '',
      kgAuto: false,
      litersAuto: valid,
      hasKilograms: valid,
      hasLiters: false,
      actualKg: value,
      enteredLiters: null,
      actualLiters: valid ? value / density : 0,
    };
  }
  if (state.source === 'liters') {
    return {
      kgText: valid ? (value * density).toFixed(1) : '',
      litersText: state.sourceText,
      kgAuto: valid,
      litersAuto: false,
      hasKilograms: false,
      hasLiters: valid,
      actualKg: null,
      enteredLiters: value,
      actualLiters: valid ? value : 0,
    };
  }
  return { kgText: '', litersText: '', kgAuto: false, litersAuto: false, hasKilograms: false, hasLiters: false, actualKg: null, enteredLiters: null, actualLiters: 0 };
}
