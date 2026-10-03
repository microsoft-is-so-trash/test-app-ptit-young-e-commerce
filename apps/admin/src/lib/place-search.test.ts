import { describe, expect, it } from 'vitest';
import { formatCoordinate, parseCoordinates, PLACES_DEBOUNCE_MS, PLACES_MIN_CHARS, shouldSearchPlaces } from './place-search';

describe('place search (I1.1)', () => {
  it('searches only after at least 3 non-space characters, waiting 300 ms', () => {
    expect(PLACES_MIN_CHARS).toBe(3);
    expect(PLACES_DEBOUNCE_MS).toBe(300);
    expect(shouldSearchPlaces('ab')).toBe(false);
    expect(shouldSearchPlaces('  ab  ')).toBe(false);
    expect(shouldSearchPlaces('22 ')).toBe(false);
    expect(shouldSearchPlaces('22 H')).toBe(true);
  });

  it('does not search longer than the backend limit', () => {
    expect(shouldSearchPlaces('a'.repeat(201))).toBe(false);
  });

  it('parses the form coordinates only when both are valid', () => {
    expect(parseCoordinates('21.0341', '105.8522')).toEqual({ lat: 21.0341, lng: 105.8522 });
    expect(parseCoordinates('', '105.8522')).toBeNull();
    expect(parseCoordinates('91', '105')).toBeNull();
    expect(parseCoordinates('21', 'abc')).toBeNull();
  });

  it('formats a picked coordinate with 6 decimals for the form', () => {
    expect(formatCoordinate(21.034112345)).toBe('21.034112');
    expect(formatCoordinate(105.85)).toBe('105.850000');
  });
});
