import { describe, expect, it } from 'vitest';
import { formatMoney, payBreakdown, totalMinorUnits } from '../src/money';

describe('formatting money', () => {
  it('drops empty decimals on a whole amount and keeps them otherwise', () => {
    expect(formatMoney(17_500)).toBe('£175');
    expect(formatMoney(150)).toBe('£1.50');
    expect(formatMoney(0)).toBe('£0');
  });

  it('formats a currency it has never been told about', () => {
    // The point of the exercise: nothing in here knows about sterling. The
    // market is UK today and `residency_zone` already models eea and other.
    expect(formatMoney(1999, 'EUR')).toBe('€19.99');
    expect(formatMoney(1999, 'USD')).toBe('US$19.99');
  });

  it('takes the divisor from the currency, not from 100', () => {
    // Yen has no minor unit. A hardcoded /100 would render ¥500 as ¥5.
    expect(formatMoney(500, 'JPY')).toBe('JP¥500');
  });

  it('sums minor units without going near a float', () => {
    const lines = [
      { label: 'audit', minorUnits: 10_000 },
      { label: 'travel uplift', minorUnits: 1_500 },
    ];
    expect(totalMinorUnits(lines)).toBe(11_500);
    expect(payBreakdown(lines)).toBe('£100 audit + £15 travel uplift');
  });

  it('itemises in whatever currency it is given', () => {
    expect(payBreakdown([{ label: 'audit', minorUnits: 10_000 }], 'EUR')).toBe('€100 audit');
  });
});
