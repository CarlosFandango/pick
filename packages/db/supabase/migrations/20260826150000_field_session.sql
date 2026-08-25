-- ---------------------------------------------------------------------------
-- Slice 6 — S1.5b Field session, S2.3 Flag sheet.
--
-- The auditor taps once to advance the shift; timestamps land on moments. A
-- FLAG marks "something happened here" without detail — detail is for write-up,
-- when they are not standing three metres from the person they are observing.
--
-- Everything here is an observation, not a verdict. Nothing on this screen
-- decides pass or fail.
-- ---------------------------------------------------------------------------

-- How much a flag is worth looking at, in the auditor's own words at the time.
-- Three values, deliberately: a scale invites deliberation the street does not
-- allow for.
create type public.flag_severity as enum ('wrong', 'note', 'fine');

alter table public.observation_log
  add column severity public.flag_severity,
  -- Only an incident carries a severity; a timing mark is not "fine".
  add constraint severity_only_on_incident
    check (severity is null or kind = 'incident');

-- The shift's own clock, distinct from any moment within it.
alter table public.audit
  add column session_started_at timestamptz,
  add column session_ended_at timestamptz,
  add constraint session_ordered
    check (session_ended_at is null or session_started_at is null
           or session_ended_at >= session_started_at);
