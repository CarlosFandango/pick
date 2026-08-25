-- ---------------------------------------------------------------------------
-- Foundation: helper schema, UUIDv7, append-only enforcement, touch trigger.
-- ---------------------------------------------------------------------------

create schema if not exists app;
revoke all on schema app from public, anon, authenticated;
grant usage on schema app to postgres, service_role;

-- UUIDv7: time-ordered ids. Field devices mint their own (offline, idempotent
-- sync); the server default covers everything created online.
create or replace function public.uuid_generate_v7()
returns uuid
language plpgsql
volatile
as $$
begin
  -- Take a v4 uuid (correct variant bits), overlay a 48-bit unix-ms timestamp
  -- into the leading 6 bytes, then set the version nibble to 7.
  return encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(
            int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint)
            from 3
          )
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
end;
$$;

comment on function public.uuid_generate_v7() is
  'Time-ordered UUIDv7. Ordered to the millisecond; ids minted inside the same '
  'millisecond have no guaranteed order. The device-side generator in '
  '@picksel/core adds a per-process counter and is monotonic, which is why '
  'field-event ids are minted there and not here.';

-- Append-only guard. Applied to ObservationLog, CheckResult, CreditTransaction.
-- Statement-level so it also fires on zero-row UPDATE/DELETE attempts, and so
-- it still bites when the caller is service_role (which RLS does not constrain).
create or replace function app.deny_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'relation %.% is append-only: % is not permitted',
    tg_table_schema, tg_table_name, tg_op
    using errcode = 'restrict_violation';
end;
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
