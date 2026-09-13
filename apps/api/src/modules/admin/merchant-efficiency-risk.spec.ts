import {
  scoreMerchantEfficiencyRisk,
  summarizeWardEfficiency,
  type MerchantEfficiencyLevel,
  type MerchantEfficiencyRiskInput,
} from './merchant-efficiency-risk';

const baseInput = (
  overrides: Partial<MerchantEfficiencyRiskInput> = {},
): MerchantEfficiencyRiskInput => ({
  days_since_last_collection: 2,
  avg_daily_liters: 4,
  container_capacity_liters: 30,
  pickup_count: 10,
  total_liters: 250,
  open_alert_count: 0,
  suspected_adulteration_count: 0,
  distance_km: 3,
  ...overrides,
});

describe('scoreMerchantEfficiencyRisk', () => {
  it('returns insufficient data for a merchant that has never been collected', () => {
    expect(
      scoreMerchantEfficiencyRisk(
        baseInput({ pickup_count: 0, total_liters: 0, days_since_last_collection: null }),
      ),
    ).toEqual({
      score: 0,
      level: 'INSUFFICIENT_DATA',
      reason_codes: ['NO_COLLECTION_HISTORY'],
    });
  });

  it('still scores an uncollected merchant once an alert exists', () => {
    const result = scoreMerchantEfficiencyRisk(
      baseInput({
        pickup_count: 0,
        total_liters: 0,
        days_since_last_collection: null,
        open_alert_count: 2,
      }),
    );

    expect(result.level).not.toBe('INSUFFICIENT_DATA');
    expect(result.reason_codes).toContain('OPEN_ALERT');
  });

  it('rates a frequently collected, high-yield, nearby merchant as healthy', () => {
    expect(scoreMerchantEfficiencyRisk(baseInput())).toEqual({
      score: 0,
      level: 'HEALTHY',
      reason_codes: [],
    });
  });

  it('derives the expected refill cadence from capacity and daily output', () => {
    // 30 L capacity / 3 L per day = fills in 10 days; 21 days is beyond 2x that.
    const result = scoreMerchantEfficiencyRisk(
      baseInput({ avg_daily_liters: 3, container_capacity_liters: 30, days_since_last_collection: 21 }),
    );

    expect(result.reason_codes).toContain('SEVERELY_OVERDUE');
    expect(result.level).toBe('WATCH');
  });

  it('does not flag a slow-filling merchant that is within its own cadence', () => {
    // 30 L capacity / 0.5 L per day = 60 days to fill, so 21 days idle is normal.
    const result = scoreMerchantEfficiencyRisk(
      baseInput({ avg_daily_liters: 0.5, container_capacity_liters: 30, days_since_last_collection: 21 }),
    );

    expect(result.reason_codes).not.toContain('SEVERELY_OVERDUE');
    expect(result.reason_codes).not.toContain('OVERDUE');
  });

  it('falls back to absolute day thresholds when cadence cannot be derived', () => {
    const result = scoreMerchantEfficiencyRisk(
      baseInput({ avg_daily_liters: null, days_since_last_collection: 30 }),
    );

    expect(result.reason_codes).toContain('NO_CADENCE_BASELINE');
    expect(result.reason_codes).toContain('SEVERELY_OVERDUE');
  });

  it('flags a merchant whose pickups yield very little oil per trip', () => {
    const result = scoreMerchantEfficiencyRisk(
      baseInput({ pickup_count: 10, total_liters: 30 }),
    );

    expect(result.reason_codes).toContain('VERY_LOW_YIELD');
    expect(result.score).toBe(30);
    expect(result.level).toBe('WATCH');
  });

  it('treats suspected adulteration as the dominant alert signal', () => {
    const result = scoreMerchantEfficiencyRisk(
      baseInput({ suspected_adulteration_count: 1, open_alert_count: 5 }),
    );

    expect(result.reason_codes).toContain('SUSPECTED_ADULTERATION');
    expect(result.reason_codes).not.toContain('MULTIPLE_OPEN_ALERTS');
    expect(result.score).toBe(25);
  });

  it('combines overdue, low yield and alerts into an at-risk verdict', () => {
    const result = scoreMerchantEfficiencyRisk(
      baseInput({
        avg_daily_liters: 3,
        container_capacity_liters: 30,
        days_since_last_collection: 21,
        pickup_count: 10,
        total_liters: 30,
        open_alert_count: 1,
        distance_km: 20,
      }),
    );

    // 35 overdue + 30 very low yield + 12 open alert + 10 far = 87
    expect(result.score).toBe(87);
    expect(result.level).toBe('AT_RISK');
    expect(result.reason_codes).toEqual([
      'SEVERELY_OVERDUE',
      'VERY_LOW_YIELD',
      'OPEN_ALERT',
      'FAR_FROM_STATION',
    ]);
  });

  it('caps the score at 100', () => {
    const result = scoreMerchantEfficiencyRisk(
      baseInput({
        avg_daily_liters: null,
        days_since_last_collection: 400,
        pickup_count: 10,
        total_liters: 1,
        suspected_adulteration_count: 3,
        distance_km: 50,
      }),
    );

    expect(result.score).toBe(100);
    expect(result.level).toBe('AT_RISK');
  });

  it('ignores invalid numbers instead of producing NaN', () => {
    const result = scoreMerchantEfficiencyRisk(
      baseInput({
        days_since_last_collection: Number.NaN,
        avg_daily_liters: -5,
        distance_km: Number.POSITIVE_INFINITY,
      }),
    );

    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.reason_codes).toContain('MISSING_DISTANCE');
  });

  it('reports a missing distance without inflating the score', () => {
    const withDistance = scoreMerchantEfficiencyRisk(baseInput({ distance_km: 3 }));
    const withoutDistance = scoreMerchantEfficiencyRisk(baseInput({ distance_km: null }));

    expect(withoutDistance.score).toBe(withDistance.score);
    expect(withoutDistance.reason_codes).toContain('MISSING_DISTANCE');
  });
});

describe('summarizeWardEfficiency', () => {
  const levels = (counts: Partial<Record<MerchantEfficiencyLevel, number>>): MerchantEfficiencyLevel[] =>
    (Object.entries(counts) as Array<[MerchantEfficiencyLevel, number]>).flatMap(([level, count]) =>
      Array.from({ length: count }, () => level),
    );

  it('reports insufficient data for a ward with no scored merchants', () => {
    expect(summarizeWardEfficiency([])).toEqual({
      level: 'INSUFFICIENT_DATA',
      at_risk_count: 0,
      watch_count: 0,
      healthy_count: 0,
      scored_count: 0,
    });
  });

  it('ignores merchants that have no track record yet', () => {
    const result = summarizeWardEfficiency(levels({ INSUFFICIENT_DATA: 5 }));

    expect(result.level).toBe('INSUFFICIENT_DATA');
    expect(result.scored_count).toBe(0);
  });

  it('stays healthy when nearly every merchant is healthy', () => {
    expect(summarizeWardEfficiency(levels({ HEALTHY: 9, WATCH: 1 })).level).toBe('HEALTHY');
  });

  it('drops to watch once a fifth of the ward needs attention', () => {
    expect(summarizeWardEfficiency(levels({ HEALTHY: 7, WATCH: 3 })).level).toBe('WATCH');
  });

  it('raises at-risk when a third of the ward is at risk', () => {
    expect(summarizeWardEfficiency(levels({ HEALTHY: 6, AT_RISK: 4 })).level).toBe('AT_RISK');
  });

  it('counts each level separately', () => {
    expect(summarizeWardEfficiency(levels({ HEALTHY: 2, WATCH: 3, AT_RISK: 1, INSUFFICIENT_DATA: 4 }))).toEqual({
      level: 'WATCH',
      at_risk_count: 1,
      watch_count: 3,
      healthy_count: 2,
      scored_count: 6,
    });
  });
});
