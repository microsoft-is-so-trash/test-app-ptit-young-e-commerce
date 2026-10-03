import { OilGrade, Quality } from '@eco-oil/shared-types';

/** Chất lượng tự chọn theo hạng dầu (C5.2): hạng C hoặc nghi pha lẫn → "Cần kiểm tra"; người dùng chọn tay thì giữ (U8). */
export function resolveQuality({ grade, suspectedAdulteration, manual }: { grade: OilGrade | null; suspectedAdulteration: boolean; manual: Quality | null }): { quality: Quality; isAuto: boolean } {
  if (manual !== null) return { quality: manual, isAuto: false };
  return { quality: grade === OilGrade.C || suspectedAdulteration ? Quality.FLAG : Quality.PASS, isAuto: true };
}

/** AI chọn sẵn hạng khi tin cậy cao và người thu gom chưa chọn (C5.4). */
export function aiPreselectGrade(current: OilGrade | null, analysis: { suggested_grade: string | null; confidence: string } | null): OilGrade | null {
  if (current !== null || !analysis || analysis.confidence !== 'HIGH' || !analysis.suggested_grade) return null;
  return Object.values(OilGrade).includes(analysis.suggested_grade as OilGrade) ? (analysis.suggested_grade as OilGrade) : null;
}
