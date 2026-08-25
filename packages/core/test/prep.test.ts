import { describe, expect, it } from 'vitest';
import type { AuditMoment } from '../src/moments';
import {
  buildPrepPlan,
  cardPosition,
  isPrepComplete,
  orderedMoments,
  type PrepCard,
} from '../src/prep';

let seq = 0;
function card(moment: AuditMoment, over: Partial<PrepCard> = {}): PrepCard {
  seq += 1;
  return { id: `c${seq}`, moment, prompt: `prompt ${seq}`, sortOrder: seq, ...over };
}

describe('buildPrepPlan', () => {
  it('groups cards into the sequence of the shift', () => {
    const plan = buildPrepPlan([card('ask'), card('approach'), card('close')], new Set());

    // The order the shift happens in, not the order the rows arrived.
    expect(plan.moments.map((m) => m.moment)).toEqual(['approach', 'ask', 'close']);
  });

  it('leaves out moments with no cards rather than showing empty ones', () => {
    const plan = buildPrepPlan([card('pitch')], new Set());
    expect(plan.moments).toHaveLength(1);
  });

  it('counts what has been learnt, per moment and overall', () => {
    const a = card('approach');
    const b = card('approach');
    const c = card('pitch');

    const plan = buildPrepPlan([a, b, c], new Set([a.id]));

    expect(plan.learnt).toBe(1);
    expect(plan.total).toBe(3);
    expect(plan.moments[0]).toMatchObject({ moment: 'approach', learnt: 1, total: 2 });
    expect(plan.moments[1]).toMatchObject({ moment: 'pitch', learnt: 0, total: 1 });
  });

  it('points at the first card not yet learnt in each moment', () => {
    const first = card('opening', { sortOrder: 1 });
    const second = card('opening', { sortOrder: 2 });

    const plan = buildPrepPlan([second, first], new Set([first.id]));
    expect(plan.moments[0]?.nextCard?.id).toBe(second.id);
  });

  it('has no next card once a moment is complete', () => {
    const only = card('close');
    const plan = buildPrepPlan([only], new Set([only.id]));
    expect(plan.moments[0]?.nextCard).toBeNull();
  });

  it('points at the first incomplete moment as the current one', () => {
    const done = card('approach');
    const todo = card('pitch');

    const plan = buildPrepPlan([done, todo], new Set([done.id]));
    expect(plan.currentMoment).toBe('pitch');
  });

  it('has no current moment when everything is learnt', () => {
    const a = card('approach');
    const plan = buildPrepPlan([a], new Set([a.id]));

    expect(plan.currentMoment).toBeNull();
    expect(isPrepComplete(plan)).toBe(true);
  });

  it('is not complete when there is nothing to learn', () => {
    // An empty catalogue is a bug upstream, not a prepared auditor.
    expect(isPrepComplete(buildPrepPlan([], new Set()))).toBe(false);
  });

  it('sorts cards within a moment by their catalogue order', () => {
    const later = card('ask', { sortOrder: 20 });
    const earlier = card('ask', { sortOrder: 10 });

    const plan = buildPrepPlan([later, earlier], new Set());
    expect(plan.moments[0]?.cards.map((c) => c.id)).toEqual([earlier.id, later.id]);
  });

  it('ignores a learnt id that is not in the catalogue', () => {
    const a = card('pitch');
    const plan = buildPrepPlan([a], new Set(['retired-card', a.id]));
    expect(plan.learnt).toBe(1);
  });
});

describe('cardPosition', () => {
  it('is one-based within its own moment', () => {
    const cards = [card('tablet'), card('tablet'), card('tablet')];
    const plan = buildPrepPlan(cards, new Set());
    const moment = plan.moments[0];

    expect(moment && cardPosition(moment, cards[2] as PrepCard)).toBe(3);
  });
});

describe('orderedMoments', () => {
  it('always reads approach first and close last', () => {
    const plan = buildPrepPlan([card('close'), card('approach'), card('tablet')], new Set());
    const order = orderedMoments(plan).map((m) => m.moment);

    expect(order.at(0)).toBe('approach');
    expect(order.at(-1)).toBe('close');
  });
});
