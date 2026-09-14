import {
  AlertSeverity,
  AlertType,
  MassSource,
  OilGrade,
  Quality,
} from '@eco-oil/shared-types';
import type {
  AdminAiAnomaliesResponse,
  AdminAiAnomalyItem,
  AdminAiAnomalyPerformanceResponse,
  AdminAlert,
  AdminImageGradingPerformanceResponse,
  AdminPickupForecastPerformanceResponse,
  AdminReconciliationCollector,
  AdminReconciliationResponse,
  AdminReconciliationTransaction,
  AnomalyFeedbackVerdict,
  AdminAnomalyFeedback,
} from '@eco-oil/shared-types';
import {
  DEMO_COLLECTORS,
  DEMO_TRANSACTIONS,
  collectorName,
  isoHoursAgo,
  merchantById,
  merchantName,
  type DemoTransaction,
} from './demo-dataset';

/**
 * Phần dữ liệu demo suy ra từ giao dịch: cảnh báo, chấm điểm bất thường,
 * hiệu quả AI và đối soát cuối ngày. Chỉ phụ thuộc demo-dataset để tránh
 * vòng lặp import với demo-admin-store.
 */

const DENSITY_KG_PER_LITER = 0.91;

/* ── Cảnh báo ── */

export function demoAlerts(): AdminAlert[] {
  const flagged = DEMO_TRANSACTIONS.find((txn) => txn.suspected_adulteration);
  const estimated = DEMO_TRANSACTIONS.filter((txn) => txn.hoursAgo < 72).slice(0, 2);

  const alerts: AdminAlert[] = [];

  if (flagged) {
    alerts.push({
      id: 'demo-alert-01',
      type: AlertType.SUSPECTED_ADULTERATION,
      severity: AlertSeverity.HIGH,
      message: `Nghi ngờ dầu pha lẫn tại ${merchantName(flagged.merchant_id)}`,
      details: {
        merchant_id: flagged.merchant_id,
        transaction_id: flagged.id,
        collector_name: collectorName(flagged.collector_id),
        actual_liters: flagged.liters,
      },
      created_at: isoHoursAgo(flagged.hoursAgo),
      resolved_at: null,
    });
    alerts.push({
      id: 'demo-alert-02',
      type: AlertType.OIL_GRADE_C,
      severity: AlertSeverity.MEDIUM,
      message: `Dầu hạng C tại ${merchantName(flagged.merchant_id)}`,
      details: {
        merchant_id: flagged.merchant_id,
        transaction_id: flagged.id,
        grade: OilGrade.C,
      },
      created_at: isoHoursAgo(flagged.hoursAgo),
      resolved_at: null,
    });
  }

  estimated.forEach((txn, index) => {
    alerts.push({
      id: `demo-alert-1${index}`,
      type: AlertType.MASS_ESTIMATED_NOT_WEIGHED,
      severity: AlertSeverity.LOW,
      message: `Khối lượng ước lượng chưa qua cân tại ${merchantName(txn.merchant_id)}`,
      details: {
        merchant_id: txn.merchant_id,
        transaction_id: txn.id,
        actual_liters: txn.liters,
      },
      created_at: isoHoursAgo(txn.hoursAgo),
      resolved_at: null,
    });
  });

  alerts.push({
    id: 'demo-alert-20',
    type: AlertType.DELIVERY_VARIANCE,
    severity: AlertSeverity.MEDIUM,
    message: 'Chênh lệch giữa lượng thu và lượng giao về trạm vượt ngưỡng 5%',
    details: {
      collector_id: 'demo-collector-002',
      collector_name: 'Trần Thị Hằng',
      variance_l: -3.2,
    },
    created_at: isoHoursAgo(30),
    resolved_at: null,
  });

  alerts.push({
    id: 'demo-alert-21',
    type: AlertType.GEO_MISMATCH,
    severity: AlertSeverity.LOW,
    message: 'Vị trí ghi nhận lệch hơn 300m so với địa chỉ quán',
    details: { merchant_id: 'demo-merchant-008', distance_m: 340 },
    created_at: isoHoursAgo(52),
    resolved_at: isoHoursAgo(20),
  });

  return alerts;
}

/* ── Chấm điểm bất thường ── */

function riskFor(txn: DemoTransaction): { score: number; level: 'NORMAL' | 'REVIEW' | 'HIGH_RISK' } {
  if (txn.suspected_adulteration) return { score: 88, level: 'HIGH_RISK' };
  if (txn.grade === OilGrade.B) return { score: 46, level: 'REVIEW' };
  return { score: 12, level: 'NORMAL' };
}

function reasonsFor(txn: DemoTransaction) {
  if (txn.suspected_adulteration) {
    return [
      {
        code: 'SUSPECTED_ADULTERATION',
        label: 'Người thu gom đánh dấu nghi pha lẫn',
        description: 'Người thu gom bật cờ nghi ngờ ngay tại điểm thu.',
        contribution: 55,
        evidence: { flagged_by: collectorName(txn.collector_id) },
        severity: AlertSeverity.HIGH,
      },
      {
        code: 'GRADE_DOWNGRADE',
        label: 'Hạng dầu thấp bất thường',
        description: 'Quán này thường giao hạng A, lần này xuống hạng C.',
        contribution: 33,
        evidence: { usual_grade: OilGrade.A, this_grade: OilGrade.C },
        severity: AlertSeverity.MEDIUM,
      },
    ];
  }
  return [
    {
      code: 'VOLUME_DEVIATION',
      label: 'Sản lượng lệch so với thường lệ',
      description: 'Số lít chênh so với trung bình các lần trước của quán.',
      contribution: 46,
      evidence: { deviation_pct: 18 },
      severity: AlertSeverity.MEDIUM,
    },
  ];
}

const feedbackStore = new Map<string, AdminAnomalyFeedback>();

function toAnomalyItem(txn: DemoTransaction): AdminAiAnomalyItem {
  const risk = riskFor(txn);
  return {
    id: `demo-anomaly-${txn.id}`,
    transaction_id: txn.id,
    merchant_id: txn.merchant_id,
    merchant_name: merchantName(txn.merchant_id),
    collector_name: collectorName(txn.collector_id),
    actual_liters: txn.liters,
    actual_kg: Number((txn.liters * DENSITY_KG_PER_LITER).toFixed(2)),
    quality: txn.quality,
    grade: txn.grade,
    collected_at: isoHoursAgo(txn.hoursAgo),
    risk_score: risk.score,
    risk_level: risk.level,
    explanation_summary: txn.suspected_adulteration
      ? 'Bị đánh dấu nghi pha lẫn và hạng dầu tụt so với lịch sử của quán.'
      : 'Sản lượng lệch so với trung bình các lần thu trước của quán.',
    reason_codes: reasonsFor(txn),
    history_size: 8,
    feedback: feedbackStore.get(txn.id) ?? null,
  };
}

/** Chỉ những giao dịch đáng soi mới vào danh sách bất thường. */
function anomalyCandidates(): DemoTransaction[] {
  return DEMO_TRANSACTIONS.filter((txn) => riskFor(txn).level !== 'NORMAL');
}

export function demoAiAnomalies(params: { window_days?: 30 | 90 | 180; risk_level?: string; verdict?: AnomalyFeedbackVerdict } = {}): AdminAiAnomaliesResponse {
  let rows = anomalyCandidates().map(toAnomalyItem);
  if (params.risk_level) rows = rows.filter((row) => row.risk_level === params.risk_level);
  if (params.verdict) rows = rows.filter((row) => row.feedback?.verdict === params.verdict);
  return {
    data: rows,
    meta: { page: 1, limit: 100, total: rows.length },
    window_days: params.window_days ?? 90,
  };
}

export function demoUpdateAnomalyFeedback(
  transactionId: string,
  body: { verdict: AnomalyFeedbackVerdict; note?: string },
): AdminAnomalyFeedback {
  const txn = DEMO_TRANSACTIONS.find((item) => item.id === transactionId);
  const risk = txn ? riskFor(txn) : { score: 0, level: 'NORMAL' as const };
  const now = new Date().toISOString();
  const existing = feedbackStore.get(transactionId);
  const feedback: AdminAnomalyFeedback = {
    id: existing?.id ?? `demo-feedback-${transactionId}`,
    verdict: body.verdict,
    note: body.note ?? null,
    reviewer_user_id: 'demo-admin-01',
    risk_score_snapshot: risk.score,
    risk_level_snapshot: risk.level,
    reasons_snapshot: txn ? reasonsFor(txn) : [],
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  feedbackStore.set(transactionId, feedback);
  return feedback;
}

export function demoAnomalyPerformance(windowDays: 30 | 90 | 180 = 90): AdminAiAnomalyPerformanceResponse {
  const items = anomalyCandidates().map(toAnomalyItem);
  const reviewed = items.filter((item) => item.feedback !== null);
  const confirmed = reviewed.filter((item) => item.feedback?.verdict === 'CONFIRMED_ANOMALY').length;
  const falsePositive = reviewed.filter((item) => item.feedback?.verdict === 'FALSE_POSITIVE').length;
  const unsure = reviewed.filter((item) => item.feedback?.verdict === 'UNSURE').length;

  const byLevel = (['HIGH_RISK', 'REVIEW', 'NORMAL'] as const).map((level) => ({
    risk_level: level,
    count: items.filter((item) => item.risk_level === level).length,
  }));

  const codeCounts = new Map<string, number>();
  for (const item of items) {
    for (const reason of item.reason_codes) {
      codeCounts.set(reason.code, (codeCounts.get(reason.code) ?? 0) + 1);
    }
  }

  return {
    window_days: windowDays,
    total_alerts: items.length,
    reviewed_count: reviewed.length,
    unreviewed_count: items.length - reviewed.length,
    feedback_coverage_percent: items.length === 0 ? 0 : Math.round((reviewed.length / items.length) * 100),
    confirmed_count: confirmed,
    false_positive_count: falsePositive,
    unsure_count: unsure,
    confirmed_rate_percent: reviewed.length === 0 ? null : Math.round((confirmed / reviewed.length) * 100),
    false_positive_rate_percent:
      reviewed.length === 0 ? null : Math.round((falsePositive / reviewed.length) * 100),
    breakdown_by_risk_level: byLevel,
    breakdown_by_reason_code: [...codeCounts.entries()].map(([code, count]) => ({ code, count })),
    recent_reviewed_items: reviewed.slice(0, 5),
    explanation:
      'Tỷ lệ xác nhận tính trên số cảnh báo đã có người duyệt. Cảnh báo chưa duyệt không được tính vào mẫu số.',
  };
}

/* ── Hiệu quả dự báo sản lượng ── */

export function demoPickupForecastPerformance(windowDays: 30 | 90 | 180 = 90): AdminPickupForecastPerformanceResponse {
  const sample = DEMO_TRANSACTIONS.filter((txn) => txn.hoursAgo <= windowDays * 24);
  const points = sample.slice(0, 12).map((txn, index) => {
    // Dự báo lệch dần để biểu đồ có cả trường hợp cao hơn và thấp hơn thực tế.
    const drift = [0.94, 1.08, 0.99, 1.14, 0.9, 1.03][index % 6];
    const predicted = Number((txn.liters * drift).toFixed(1));
    const absoluteError = Number(Math.abs(predicted - txn.liters).toFixed(1));
    return {
      merchant_id: txn.merchant_id,
      merchant_name: merchantName(txn.merchant_id),
      collected_at: isoHoursAgo(txn.hoursAgo),
      predicted_liters: predicted,
      actual_liters: txn.liters,
      absolute_error_liters: absoluteError,
      error_percentage_pct: Number(((absoluteError / txn.liters) * 100).toFixed(1)),
      confidence: (index % 5 === 4 ? 'LOW' : index % 3 === 0 ? 'HIGH' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
      history_sample_size: index % 5 === 4 ? 2 : 8,
      direction:
        predicted > txn.liters ? ('HIGHER_THAN_ACTUAL' as const) : predicted < txn.liters ? ('LOWER_THAN_ACTUAL' as const) : ('MATCH' as const),
    };
  });

  const totalActual = points.reduce((sum, point) => sum + point.actual_liters, 0);
  const totalError = points.reduce((sum, point) => sum + point.absolute_error_liters, 0);
  const bias = points.reduce((sum, point) => sum + (point.predicted_liters - point.actual_liters), 0);

  return {
    window_days: windowDays,
    window_start: isoHoursAgo(windowDays * 24),
    window_end: new Date().toISOString(),
    sample_count: points.length,
    mae_liters: points.length === 0 ? null : Number((totalError / points.length).toFixed(2)),
    wape_pct: totalActual === 0 ? null : Number(((totalError / totalActual) * 100).toFixed(1)),
    bias_liters: points.length === 0 ? null : Number((bias / points.length).toFixed(2)),
    accuracy_pct: totalActual === 0 ? null : Number((100 - (totalError / totalActual) * 100).toFixed(1)),
    within_10_pct_count: points.filter((point) => (point.error_percentage_pct ?? 100) <= 10).length,
    within_20_pct_count: points.filter((point) => (point.error_percentage_pct ?? 100) <= 20).length,
    reliability: points.length >= 10 ? 'MEDIUM' : 'LOW',
    points,
    explanation: {
      method: 'ROLLING_ORIGIN',
      summary:
        'Mỗi lần dự báo chỉ dùng các lần thu trước đó của chính quán, rồi so với số lít thực tế đo được.',
      data_leakage_prevention:
        'Không đưa giao dịch đang dự báo vào lịch sử tính toán, nên mô hình không nhìn trước đáp án.',
    },
  };
}

/* ── Hiệu quả chấm hạng dầu bằng ảnh ── */

export function demoImageGradingPerformance(windowDays: 30 | 90 | 180 = 90): AdminImageGradingPerformanceResponse {
  const sample = DEMO_TRANSACTIONS.filter((txn) => txn.hoursAgo <= windowDays * 24);
  const analyzed = sample.length;
  const overrides = sample.filter((txn) => txn.grade !== OilGrade.A).length;
  const accepted = analyzed - overrides;

  return {
    window_days: windowDays,
    window_start: isoHoursAgo(windowDays * 24),
    window_end: new Date().toISOString(),
    analyzed_count: analyzed,
    accepted_count: accepted,
    override_count: overrides,
    low_confidence_count: Math.max(1, Math.round(analyzed * 0.15)),
    retake_recommended_count: 1,
    agreement_count: accepted,
    agreement_rate_percent: analyzed === 0 ? null : Math.round((accepted / analyzed) * 100),
    reliability: analyzed >= 10 ? 'MEDIUM' : 'LOW',
    breakdown_by_confidence: [
      { confidence: 'HIGH', count: Math.round(analyzed * 0.55) },
      { confidence: 'MEDIUM', count: Math.round(analyzed * 0.3) },
      { confidence: 'LOW', count: Math.max(1, Math.round(analyzed * 0.15)) },
    ],
    breakdown_by_decision_source: [
      { source: 'AI_SUGGESTION_ACCEPTED', count: accepted },
      { source: 'MANUAL_OVERRIDE_AI', count: overrides },
      { source: 'MANUAL', count: 0 },
    ],
    recent_disagreements: sample
      .filter((txn) => txn.grade !== OilGrade.A)
      .slice(0, 4)
      .map((txn) => ({
        transaction_id: txn.id,
        merchant_id: txn.merchant_id,
        merchant_name: merchantName(txn.merchant_id),
        collected_at: isoHoursAgo(txn.hoursAgo),
        suggested_grade: OilGrade.A,
        selected_grade: txn.grade,
        confidence: 'MEDIUM' as const,
        reason_codes: ['COLOR_DARKER_THAN_REFERENCE'],
      })),
    explanation:
      'Tỷ lệ đồng thuận là số lần người thu gom giữ nguyên hạng AI gợi ý, chia cho tổng số ảnh được chấm.',
  };
}

/* ── Đối soát ── */

function toReconciliationTransaction(txn: DemoTransaction): AdminReconciliationTransaction {
  return {
    id: txn.id,
    merchant_name: merchantName(txn.merchant_id),
    liters: txn.liters,
    kilograms: Number((txn.liters * DENSITY_KG_PER_LITER).toFixed(2)),
    mass_source: MassSource.ESTIMATED_FROM_VOLUME,
    grade: txn.grade,
    suspected_adulteration: txn.suspected_adulteration,
    collected_at: isoHoursAgo(txn.hoursAgo),
  };
}

export function demoReconciliation(date: string): AdminReconciliationResponse {
  const target = date.slice(0, 10);
  const sameDay = DEMO_TRANSACTIONS.filter(
    (txn) => isoHoursAgo(txn.hoursAgo).slice(0, 10) === target,
  );

  const byCollector: AdminReconciliationCollector[] = DEMO_COLLECTORS.filter(
    (collector) => collector.link_status === 'LINKED',
  ).map((collector) => {
    const rows = sameDay.filter((txn) => txn.collector_id === collector.id);
    const collected = rows.reduce((sum, txn) => sum + txn.liters, 0);
    // Người thứ hai giao thiếu một chút, để thấy trạng thái FLAGGED.
    const deliveredRatio = collector.id === 'demo-collector-002' ? 0.94 : 1;
    const delivered = Number((collected * deliveredRatio).toFixed(1));
    const variance = Number((delivered - collected).toFixed(1));
    return {
      collector_id: collector.id,
      name: collector.display_name,
      collected_l: Number(collected.toFixed(1)),
      delivered_l: delivered,
      variance_l: variance,
      collected_kg: Number((collected * DENSITY_KG_PER_LITER).toFixed(2)),
      delivered_kg: Number((delivered * DENSITY_KG_PER_LITER).toFixed(2)),
      variance_kg: Number((variance * DENSITY_KG_PER_LITER).toFixed(2)),
      has_estimated_mass: true,
      status: collected > 0 && Math.abs(variance / collected) > 0.05 ? 'FLAGGED' : 'OK',
      transactions: rows.map(toReconciliationTransaction),
    };
  });

  const collectedLiters = byCollector.reduce((sum, row) => sum + row.collected_l, 0);
  const deliveredLiters = byCollector.reduce((sum, row) => sum + row.delivered_l, 0);
  const variance = Number((deliveredLiters - collectedLiters).toFixed(1));

  return {
    date: target,
    collected_liters: Number(collectedLiters.toFixed(1)),
    delivered_liters: Number(deliveredLiters.toFixed(1)),
    variance_l: variance,
    variance_pct: collectedLiters === 0 ? 0 : Number((variance / collectedLiters).toFixed(4)),
    collected_kg: Number((collectedLiters * DENSITY_KG_PER_LITER).toFixed(2)),
    delivered_kg: Number((deliveredLiters * DENSITY_KG_PER_LITER).toFixed(2)),
    variance_kg: Number((variance * DENSITY_KG_PER_LITER).toFixed(2)),
    variance_kg_pct:
      collectedLiters === 0 ? 0 : Number((variance / collectedLiters).toFixed(4)),
    variance_threshold_pct: 0.02,
    has_estimated_mass: true,
    by_collector: byCollector,
    undelivered_transactions: sameDay.filter((txn) => !txn.delivered).map(toReconciliationTransaction),
  };
}

export function demoReconciliationCsv(date: string): string {
  const report = demoReconciliation(date);
  const header = 'collector,collected_l,delivered_l,variance_l,status';
  const rows = report.by_collector.map(
    (row) => `${row.name},${row.collected_l},${row.delivered_l},${row.variance_l},${row.status}`,
  );
  return [header, ...rows].join('\n');
}

/** Giao dịch gần nhất cho bảng Tổng quan. */
export function demoRecentTransactions(limit: number) {
  return DEMO_TRANSACTIONS.slice(0, limit).map((txn) => ({
    id: txn.id,
    merchant_name: merchantName(txn.merchant_id),
    collector_name: collectorName(txn.collector_id),
    actual_liters: txn.liters,
    actual_kg: Number((txn.liters * DENSITY_KG_PER_LITER).toFixed(2)),
    mass_source: MassSource.ESTIMATED_FROM_VOLUME,
    grade: txn.grade,
    suspected_adulteration: txn.suspected_adulteration,
    quality: txn.quality,
    collected_at: isoHoursAgo(txn.hoursAgo),
    image_grade_suggestion: OilGrade.A,
    image_grade_confidence: 'MEDIUM' as const,
    grade_decision_source: txn.grade === OilGrade.A ? ('AI_SUGGESTION_ACCEPTED' as const) : ('MANUAL_OVERRIDE_AI' as const),
  }));
}

export { merchantById, Quality };
