import { describe, expect, it } from 'vitest';
import { clientsLede, payoutsLede, risksLede } from '../src/admin-ledes';

describe('money out', () => {
  const base = {
    readyCount: 2,
    readyMinorUnits: 25000,
    auditorCount: 2,
    heldCount: 1,
    currency: 'GBP' as const,
  };

  it('leads with what can go out today, not what is owed in total', () => {
    const lede = payoutsLede(base);
    expect(lede.meta).toBe('£250 ready');
    expect(lede.headline).toBe('2 audits are cleared for payment, across 2 auditors.');
  });

  it('says where the rest of the money is, so the gap is not a mystery', () => {
    expect(payoutsLede(base).detail).toContain('with review');
    expect(payoutsLede({ ...base, heldCount: 0 }).detail).toBe('Nothing is held.');
  });

  it('does not offer a run when there is nothing to pay', () => {
    const lede = payoutsLede({ ...base, readyCount: 0, readyMinorUnits: 0, auditorCount: 0 });
    expect(lede.headline).toBe('No audits are cleared for payment.');
  });
});

describe('the risk register', () => {
  it('leads with the failure: a risk the charity has not been told about', () => {
    const lede = risksLede({ open: 2, advised: 1, unadvised: 1 });
    expect(lede.tone).toBe('breach');
    expect(lede.headline).toBe('One risk has not been put to the charity in writing.');
  });

  it('says the register is doing its job when everything has been advised', () => {
    const lede = risksLede({ open: 1, advised: 1, unadvised: 0 });
    expect(lede.tone).toBe('clear');
    expect(lede.headline).toBe(
      'Everything we have spotted has been put to the charity in writing.',
    );
  });

  it('treats an open-but-advised risk as the register working, not a failure', () => {
    // Waiting on a charity's answer is the process, not a gap.
    expect(risksLede({ open: 3, advised: 3, unadvised: 0 }).tone).toBe('clear');
  });
});

describe('charities and credits', () => {
  it('names who to talk to before it names who exists', () => {
    const lede = clientsLede({
      total: 4,
      runningLow: [{ name: 'Rowan Mercy Trust', balance: 2 }],
      openConcerns: 0,
    });
    expect(lede.headline).toBe('One charity will run out of credits after their next booking.');
    expect(lede.detail).toContain('Rowan Mercy Trust');
  });

  it('falls back to open concerns when nobody is short', () => {
    const lede = clientsLede({ total: 4, runningLow: [], openConcerns: 1 });
    expect(lede.headline).toContain('waiting to hear back');
  });

  it('says so plainly when there is nothing to do', () => {
    expect(clientsLede({ total: 4, runningLow: [], openConcerns: 0 }).tone).toBe('clear');
  });
});
