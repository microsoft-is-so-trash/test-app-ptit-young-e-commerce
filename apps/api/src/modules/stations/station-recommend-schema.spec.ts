import { stationRecommendSchema } from '@eco-oil/validation';

describe('stationRecommendSchema', () => {
  it('accepts 0 liters so the collector app can store every receiving station at shift start (I1.3)', () => {
    expect(stationRecommendSchema.parse({ lat: '21.0285', lng: '105.8542', liters: '0' })).toEqual({ lat: 21.0285, lng: 105.8542, liters: 0 });
  });

  it('still rejects negative liters', () => {
    expect(() => stationRecommendSchema.parse({ lat: 21.0285, lng: 105.8542, liters: -1 })).toThrow();
  });

  it('still requires liters', () => {
    expect(() => stationRecommendSchema.parse({ lat: 21.0285, lng: 105.8542 })).toThrow();
  });
});
