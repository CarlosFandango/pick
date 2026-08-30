'use client';

import { TRAVEL_MODE_LABELS, type travelMode } from '@picksel/core';
import { color, radius } from '@picksel/tokens';
import { useEffect, useState, useTransition } from 'react';
import { bodyText, hairline, metaLabel, sans } from '@/lib/theme';

/**
 * Where an auditor will work.
 *
 * The hardest question in onboarding, and the one the first two versions got
 * wrong. V1 asked for postcode areas — geography an auditor has to look up.
 * Nobody thinks in postcode areas; they think "45 minutes on the tube" or "an
 * hour in the car". V2 asked for travel time and then showed them postcode
 * areas anyway, which is the same problem wearing a hat.
 *
 * So: a place, a number of minutes, a mode of travel — and the codes never
 * appear. The list of places is PROPOSED from those three and then confirmed,
 * because the auditor knows the roads better than the arithmetic does, and a
 * place they untick is stored as an exclusion rather than as an absence.
 */
export interface Place {
  id: string;
  name: string;
  region: string | null;
}

export interface ReachablePlace {
  id: string;
  name: string;
  minutes: number;
}

const MINUTE_OPTIONS = [30, 45, 60, 90];

export function CoverageChooser({
  places,
  propose,
  initialBasePlaceId,
  initialMinutes = 45,
  initialMode = 'own_vehicle',
  initialSelected,
}: {
  places: Place[];
  /** Server action wrapping `places_within_reach`. The geometry stays in the database. */
  propose: (basePlaceId: string, minutes: number, mode: string) => Promise<ReachablePlace[]>;
  initialBasePlaceId?: string;
  initialMinutes?: number;
  initialMode?: keyof typeof TRAVEL_MODE_LABELS;
  initialSelected?: string[];
}) {
  const [basePlaceId, setBasePlaceId] = useState(initialBasePlaceId ?? '');
  const [minutes, setMinutes] = useState(initialMinutes);
  const [mode, setMode] = useState<keyof typeof TRAVEL_MODE_LABELS>(initialMode);
  const [reachable, setReachable] = useState<ReachablePlace[]>([]);
  const [ticked, setTicked] = useState<Set<string>>(new Set(initialSelected ?? []));
  const [touched, setTouched] = useState(Boolean(initialSelected?.length));
  const [pending, start] = useTransition();

  // The circle only ever proposes. Re-running it when the inputs change ticks
  // everything it finds — except anything the auditor has already unticked,
  // which is a correction and must survive.
  useEffect(() => {
    if (!basePlaceId) return;
    start(async () => {
      const found = await propose(basePlaceId, minutes, mode);
      setReachable(found);
      setTicked((held) => {
        if (!touched) return new Set(found.map((p) => p.id));
        const next = new Set(held);
        for (const place of found) if (!held.has(place.id)) next.add(place.id);
        return next;
      });
    });
  }, [basePlaceId, minutes, mode, propose, touched]);

  const toggle = (id: string) => {
    setTouched(true);
    setTicked((held) => {
      const next = new Set(held);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {[...ticked].map((id) => (
        <input key={id} type="hidden" name="place_ids" value={id} />
      ))}
      <input type="hidden" name="base_place_id" value={basePlaceId} />
      <input type="hidden" name="max_travel_minutes" value={minutes} />
      <input type="hidden" name="travel_mode" value={mode} />

      <div>
        <div style={{ ...metaLabel, marginBottom: 6 }}>You set out from</div>
        <select
          value={basePlaceId}
          onChange={(event) => setBasePlaceId(event.target.value)}
          required
          aria-label="You set out from"
          style={{
            fontFamily: sans,
            fontSize: 14,
            padding: '11px 13px',
            border: hairline,
            borderRadius: radius.tile,
            background: color.paper,
            width: '100%',
            maxWidth: 340,
          }}
        >
          <option value="">Choose a place</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>
              {place.name}
              {place.region ? ` · ${place.region}` : ''}
            </option>
          ))}
        </select>
        <p style={{ ...bodyText, margin: '7px 0 0', maxWidth: '54ch' }}>
          Home, or wherever you would usually travel from.
        </p>
      </div>

      <div>
        <div style={{ ...metaLabel, marginBottom: 6 }}>How far, each way</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MINUTE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMinutes(option)}
              aria-pressed={minutes === option}
              style={{
                border: minutes === option ? `2px solid ${color.teal}` : hairline,
                background: color.paper,
                borderRadius: radius.tile,
                padding: minutes === option ? '11px 21px' : '12px 22px',
                fontFamily: sans,
                fontSize: 15,
                fontWeight: minutes === option ? 700 : 500,
                color: minutes === option ? color.ink : color.bodyBrown,
                cursor: 'pointer',
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <p style={{ ...bodyText, margin: '7px 0 0' }}>Minutes, door to door.</p>
      </div>

      <div>
        <div style={{ ...metaLabel, marginBottom: 6 }}>How you get there</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(Object.keys(TRAVEL_MODE_LABELS) as (keyof typeof TRAVEL_MODE_LABELS)[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              style={{
                border: mode === key ? `2px solid ${color.teal}` : hairline,
                background: color.paper,
                borderRadius: radius.tile,
                padding: mode === key ? '11px 17px' : '12px 18px',
                fontFamily: sans,
                fontSize: 14,
                fontWeight: mode === key ? 700 : 500,
                color: mode === key ? color.ink : color.bodyBrown,
                cursor: 'pointer',
              }}
            >
              {TRAVEL_MODE_LABELS[key]}
            </button>
          ))}
        </div>
        <p style={{ ...bodyText, margin: '7px 0 0', maxWidth: '54ch' }}>
          Driving reaches further, and some sites — retail parks, private venues — are hard to get
          to any other way.
        </p>
      </div>

      <div>
        <div style={{ ...metaLabel, marginBottom: 4 }}>Which means these places</div>
        <p style={{ ...bodyText, margin: '0 0 10px', maxWidth: '58ch' }}>
          Worked out from where you start and how far you will go. Untick anywhere you would not
          actually travel — you know the roads better than we do.
        </p>

        {!basePlaceId ? (
          <p style={{ ...bodyText, margin: 0, color: color.muted }}>
            Choose where you set out from and we will work these out.
          </p>
        ) : pending && reachable.length === 0 ? (
          <p style={{ ...bodyText, margin: 0, color: color.muted }}>Working them out…</p>
        ) : reachable.length === 0 ? (
          <p style={{ ...bodyText, margin: 0, color: color.creativeText }}>
            Nowhere is within {minutes} minutes of there. Try a longer journey.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 8,
              opacity: pending ? 0.6 : 1,
            }}
          >
            {reachable.map((place, index) => {
              const on = ticked.has(place.id);
              return (
                <label
                  key={place.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    background: color.paper,
                    border: on ? `1px solid ${color.teal}` : hairline,
                    borderRadius: radius.tile,
                    padding: '11px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(place.id)}
                    style={{ width: 17, height: 17, accentColor: color.teal }}
                  />
                  <span style={{ flexGrow: 1, minWidth: 0 }}>
                    <span
                      style={{ display: 'block', fontFamily: sans, fontSize: 14, fontWeight: 600 }}
                    >
                      {place.name}
                    </span>
                    <span style={{ ...bodyText, display: 'block', fontSize: 11.5 }}>
                      {index === 0 ? 'Where you are' : `About ${place.minutes} min`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <p style={{ ...bodyText, margin: '10px 0 0' }}>
          {ticked.size === 0
            ? 'Tick at least one place.'
            : `${ticked.size} ${ticked.size === 1 ? 'place' : 'places'} — this is what decides which audits reach you.`}
        </p>
      </div>
    </div>
  );
}
