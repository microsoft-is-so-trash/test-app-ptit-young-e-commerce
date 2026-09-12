import { computeMerchantRanking } from './merchant-ranking';

describe('computeMerchantRanking', () => {
  it('ranks merchants by this-month liters, descending', () => {
    const currentMonth = [
      { merchant_id: 'a', liters: 100 },
      { merchant_id: 'b', liters: 300 },
      { merchant_id: 'c', liters: 200 },
    ];
    const result = computeMerchantRanking(currentMonth, [], 'c');
    expect(result.rank).toBe(2);
    expect(result.total).toBe(3);
    expect(result.liters_this_month).toBe(200);
  });

  it('reports a positive rank_change when the merchant moved up since last month', () => {
    const currentMonth = [
      { merchant_id: 'a', liters: 50 },
      { merchant_id: 'b', liters: 300 },
    ];
    const previousMonth = [
      { merchant_id: 'a', liters: 10 },
      { merchant_id: 'b', liters: 300 },
    ];
    // Tháng trước 'a' hạng 2/2, tháng này 'a' vẫn hạng 2/2 nhưng lít tăng -> rank_change 0
    const result = computeMerchantRanking(currentMonth, previousMonth, 'a');
    expect(result.rank_change).toBe(0);
  });

  it('reports how many places a merchant climbed compared to last month', () => {
    const currentMonth = [
      { merchant_id: 'a', liters: 400 },
      { merchant_id: 'b', liters: 300 },
      { merchant_id: 'c', liters: 100 },
    ];
    const previousMonth = [
      { merchant_id: 'a', liters: 50 },
      { merchant_id: 'b', liters: 300 },
      { merchant_id: 'c', liters: 400 },
    ];
    // 'a' tháng trước hạng 3/3, tháng này hạng 1/3 -> tăng 2 bậc
    const result = computeMerchantRanking(currentMonth, previousMonth, 'a');
    expect(result.rank).toBe(1);
    expect(result.rank_change).toBe(2);
  });

  it('returns rank_change null when the merchant has no data for last month', () => {
    const currentMonth = [
      { merchant_id: 'a', liters: 40 },
      { merchant_id: 'b', liters: 10 },
    ];
    const result = computeMerchantRanking(currentMonth, [], 'a');
    expect(result.rank_change).toBeNull();
  });

  it('treats merchants tied on liters as sharing the better rank (competition ranking)', () => {
    const currentMonth = [
      { merchant_id: 'a', liters: 200 },
      { merchant_id: 'b', liters: 200 },
      { merchant_id: 'c', liters: 50 },
    ];
    const resultB = computeMerchantRanking(currentMonth, [], 'b');
    const resultC = computeMerchantRanking(currentMonth, [], 'c');
    expect(resultB.rank).toBe(1);
    expect(resultC.rank).toBe(3);
  });

  it('throws when the target merchant is not present in the current-month entries', () => {
    expect(() => computeMerchantRanking([{ merchant_id: 'a', liters: 10 }], [], 'missing')).toThrow();
  });
});
