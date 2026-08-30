


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "app";


ALTER SCHEMA "app" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."app_role" AS ENUM (
    'auditor',
    'client',
    'pick_admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."assignment_outcome" AS ENUM (
    'offered',
    'accepted',
    'declined',
    'expired',
    'withdrawn'
);


ALTER TYPE "public"."assignment_outcome" OWNER TO "postgres";


CREATE TYPE "public"."audit_moment" AS ENUM (
    'approach',
    'walk_up',
    'opening',
    'pitch',
    'ask',
    'tablet',
    'sign_up',
    'close'
);


ALTER TYPE "public"."audit_moment" OWNER TO "postgres";


CREATE TYPE "public"."audit_status" AS ENUM (
    'draft',
    'booked',
    'assigned',
    'scheduled',
    'in_progress',
    'submitted',
    'in_review',
    'released',
    'cancelled',
    'no_team_present'
);


ALTER TYPE "public"."audit_status" OWNER TO "postgres";


CREATE TYPE "public"."audit_type" AS ENUM (
    'street',
    'door_to_door',
    'private_site',
    'lottery'
);


ALTER TYPE "public"."audit_type" OWNER TO "postgres";


CREATE TYPE "public"."auditor_approval_status" AS ENUM (
    'pending',
    'approved',
    'suspended',
    'rejected'
);


ALTER TYPE "public"."auditor_approval_status" OWNER TO "postgres";


CREATE TYPE "public"."check_outcome" AS ENUM (
    'pass',
    'fail',
    'not_applicable',
    'not_observed',
    'note'
);


ALTER TYPE "public"."check_outcome" OWNER TO "postgres";


CREATE TYPE "public"."client_response" AS ENUM (
    'proceeded',
    'withdrew',
    'no_response'
);


ALTER TYPE "public"."client_response" OWNER TO "postgres";


CREATE TYPE "public"."complaint_status" AS ENUM (
    'open',
    'acknowledged',
    'resolved',
    'withdrawn'
);


ALTER TYPE "public"."complaint_status" OWNER TO "postgres";


CREATE TYPE "public"."complaint_subject" AS ENUM (
    'about_audit',
    'about_fundraiser'
);


ALTER TYPE "public"."complaint_subject" OWNER TO "postgres";


CREATE TYPE "public"."compliance_category" AS ENUM (
    'identification',
    'solicitation_statement',
    'honesty_and_accuracy',
    'vulnerability',
    'pressure_and_persistence',
    'data_protection',
    'consent_and_cancellation',
    'site_conduct',
    'safeguarding',
    'record_keeping'
);


ALTER TYPE "public"."compliance_category" OWNER TO "postgres";


CREATE TYPE "public"."coverage_source" AS ENUM (
    'derived',
    'added',
    'excluded'
);


ALTER TYPE "public"."coverage_source" OWNER TO "postgres";


CREATE TYPE "public"."credit_reason" AS ENUM (
    'purchase',
    'reservation',
    'refund',
    'adjustment',
    'expiry',
    'release',
    'consumption'
);


ALTER TYPE "public"."credit_reason" OWNER TO "postgres";


CREATE TYPE "public"."eligibility_flag" AS ENUM (
    'conflict',
    'familiarity',
    'exposure',
    'capability',
    'reach'
);


ALTER TYPE "public"."eligibility_flag" OWNER TO "postgres";


CREATE TYPE "public"."evidence_kind" AS ENUM (
    'photo',
    'audio',
    'video',
    'document'
);


ALTER TYPE "public"."evidence_kind" OWNER TO "postgres";


CREATE TYPE "public"."flag_severity" AS ENUM (
    'wrong',
    'note',
    'fine'
);


ALTER TYPE "public"."flag_severity" OWNER TO "postgres";


CREATE TYPE "public"."observation_kind" AS ENUM (
    'note',
    'timing',
    'count',
    'incident'
);


ALTER TYPE "public"."observation_kind" OWNER TO "postgres";


CREATE TYPE "public"."ops_item_kind" AS ENUM (
    'offer_expiring',
    'review_gate',
    'no_show',
    'complaint',
    'vetting',
    'stale_write_up'
);


ALTER TYPE "public"."ops_item_kind" OWNER TO "postgres";


CREATE TYPE "public"."org_type" AS ENUM (
    'charity',
    'contractor',
    'pick'
);


ALTER TYPE "public"."org_type" OWNER TO "postgres";


CREATE TYPE "public"."payout_execution_method" AS ENUM (
    'manual_csv',
    'bank_api',
    'stripe_connect'
);


ALTER TYPE "public"."payout_execution_method" OWNER TO "postgres";


CREATE TYPE "public"."payout_line_status" AS ENUM (
    'pending',
    'paid',
    'failed',
    'held'
);


ALTER TYPE "public"."payout_line_status" OWNER TO "postgres";


CREATE TYPE "public"."payout_run_status" AS ENUM (
    'draft',
    'approved',
    'executing',
    'executed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."payout_run_status" OWNER TO "postgres";


CREATE TYPE "public"."residency_zone" AS ENUM (
    'uk',
    'eea',
    'other'
);


ALTER TYPE "public"."residency_zone" OWNER TO "postgres";


CREATE TYPE "public"."review_gate_mode" AS ENUM (
    'auto_approve',
    'notify',
    'hold'
);


ALTER TYPE "public"."review_gate_mode" OWNER TO "postgres";


CREATE TYPE "public"."review_gate_scope" AS ENUM (
    'payment',
    'client_release',
    'both'
);


ALTER TYPE "public"."review_gate_scope" OWNER TO "postgres";


CREATE TYPE "public"."review_gate_trigger" AS ENUM (
    'auditor_first_n_audits',
    'auditor_first_of_type',
    'client_first_audit',
    'audit_type_is_lottery',
    'assignment_has_open_risk',
    'manual'
);


ALTER TYPE "public"."review_gate_trigger" OWNER TO "postgres";


CREATE TYPE "public"."review_timeout_action" AS ENUM (
    'auto_approve',
    'escalate'
);


ALTER TYPE "public"."review_timeout_action" OWNER TO "postgres";


CREATE TYPE "public"."risk_severity" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."risk_severity" OWNER TO "postgres";


CREATE TYPE "public"."risk_source" AS ENUM (
    'system',
    'user'
);


ALTER TYPE "public"."risk_source" OWNER TO "postgres";


CREATE TYPE "public"."risk_status" AS ENUM (
    'open',
    'advised',
    'accepted',
    'withdrawn',
    'resolved'
);


ALTER TYPE "public"."risk_status" OWNER TO "postgres";


CREATE TYPE "public"."risk_subject" AS ENUM (
    'audit',
    'auditor',
    'client',
    'assignment'
);


ALTER TYPE "public"."risk_subject" OWNER TO "postgres";


CREATE TYPE "public"."risk_type" AS ENUM (
    'exposure',
    'conflict',
    'quality',
    'data_protection'
);


ALTER TYPE "public"."risk_type" OWNER TO "postgres";


CREATE TYPE "public"."shift_payment_method" AS ENUM (
    'direct_debit',
    'contactless'
);


ALTER TYPE "public"."shift_payment_method" OWNER TO "postgres";


CREATE TYPE "public"."travel_mode" AS ENUM (
    'public_transport',
    'own_vehicle',
    'either'
);


ALTER TYPE "public"."travel_mode" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'invited',
    'active',
    'suspended'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."audit_in_org"("target" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from public.audit
    where id = target and client_organisation_id = app.current_org()
  );
$$;


ALTER FUNCTION "app"."audit_in_org"("target" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."current_org"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select organisation_id from public.user_profile where id = auth.uid();
$$;


ALTER FUNCTION "app"."current_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."current_role"() RETURNS "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select role from public.user_profile where id = auth.uid();
$$;


ALTER FUNCTION "app"."current_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."deny_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  raise exception 'relation %.% is append-only: % is not permitted',
    tg_table_schema, tg_table_name, tg_op
    using errcode = 'restrict_violation';
end;
$$;


ALTER FUNCTION "app"."deny_mutation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(app.current_role() = 'pick_admin', false);
$$;


ALTER FUNCTION "app"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."owns_audit"("target" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select exists (
    select 1 from public.audit
    where id = target and auditor_id = auth.uid()
  );
$$;


ALTER FUNCTION "app"."owns_audit"("target" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "app"."touch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."single_credit_price_minor_units"() RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select price_minor_units from public.credit_bundle
  where quantity = 1 and is_active
$$;


ALTER FUNCTION "public"."single_credit_price_minor_units"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uuid_generate_v7"() RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."uuid_generate_v7"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."uuid_generate_v7"() IS 'Time-ordered UUIDv7. Ordered to the millisecond; ids minted inside the same millisecond have no guaranteed order. The device-side generator in @picksel/core adds a per-process counter and is monotonic, which is why field-event ids are minted there and not here.';



CREATE SEQUENCE IF NOT EXISTS "public"."audit_reference_seq"
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_reference_seq" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "reference" "text" DEFAULT ('PS-'::"text" || "lpad"(("nextval"('"public"."audit_reference_seq"'::"regclass"))::"text", 6, '0'::"text")) NOT NULL,
    "client_organisation_id" "uuid" NOT NULL,
    "auditor_id" "uuid",
    "status" "public"."audit_status" DEFAULT 'draft'::"public"."audit_status" NOT NULL,
    "campaign_name" "text",
    "site_name" "text",
    "address_line" "text",
    "postcode" "text" NOT NULL,
    "postcode_outward" "text" GENERATED ALWAYS AS ("upper"("left"("replace"("postcode", ' '::"text", ''::"text"), GREATEST(("length"("replace"("postcode", ' '::"text", ''::"text")) - 3), 0)))) STORED,
    "postcode_area" "text" GENERATED ALWAYS AS ("upper"("substring"("replace"("postcode", ' '::"text", ''::"text"), '^[A-Za-z]{1,2}'::"text"))) STORED,
    "scheduled_for" timestamp with time zone,
    "window_minutes" integer,
    "price_minor_units" integer DEFAULT "public"."single_credit_price_minor_units"() NOT NULL,
    "auditor_fee_minor_units" integer DEFAULT 10000,
    "check_set_version" integer DEFAULT 1 NOT NULL,
    "requested_at" timestamp with time zone,
    "matched_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "window_start_on" "date",
    "window_end_on" "date",
    "pitch_detail" "text",
    "no_team_present_at" timestamp with time zone,
    "requires_review" boolean DEFAULT true NOT NULL,
    "released_at" timestamp with time zone,
    "released_by" "uuid",
    "audit_type" "public"."audit_type" DEFAULT 'street'::"public"."audit_type" NOT NULL,
    "shift_payment_method" "public"."shift_payment_method" DEFAULT 'direct_debit'::"public"."shift_payment_method" NOT NULL,
    "session_started_at" timestamp with time zone,
    "session_ended_at" timestamp with time zone,
    "returned_moments" "public"."audit_moment"[] DEFAULT '{}'::"public"."audit_moment"[] NOT NULL,
    "returned_at" timestamp with time zone,
    "review_note" "text",
    "requires_av" boolean DEFAULT false NOT NULL,
    "preferred_auditor_id" "uuid",
    "stage_set_version" integer DEFAULT 1 NOT NULL,
    "place_id" "uuid",
    "report_read_at" timestamp with time zone,
    CONSTRAINT "assigned_when_matched" CHECK ((("status" = ANY (ARRAY['draft'::"public"."audit_status", 'booked'::"public"."audit_status", 'cancelled'::"public"."audit_status"])) OR ("auditor_id" IS NOT NULL))),
    CONSTRAINT "session_ordered" CHECK ((("session_ended_at" IS NULL) OR ("session_started_at" IS NULL) OR ("session_ended_at" >= "session_started_at"))),
    CONSTRAINT "status_in_pipeline" CHECK (("status" = ANY (ARRAY['draft'::"public"."audit_status", 'booked'::"public"."audit_status", 'assigned'::"public"."audit_status", 'in_progress'::"public"."audit_status", 'in_review'::"public"."audit_status", 'released'::"public"."audit_status", 'no_team_present'::"public"."audit_status", 'cancelled'::"public"."audit_status"]))),
    CONSTRAINT "window_ordered" CHECK ((("window_end_on" IS NULL) OR ("window_start_on" IS NULL) OR ("window_end_on" >= "window_start_on")))
);


ALTER TABLE "public"."audit" OWNER TO "postgres";


COMMENT ON COLUMN "public"."audit"."postcode" IS 'The address as written, in whatever shape the country uses. Display and navigation only — never matching, and no longer format-checked.';



COMMENT ON COLUMN "public"."audit"."place_id" IS 'Resolved when the audit is booked. What auditor matching joins on.';



COMMENT ON COLUMN "public"."audit"."report_read_at" IS 'When the client organisation first opened the released report. Null until then.';



CREATE OR REPLACE FUNCTION "public"."accept_offer"("p_offer_id" "uuid") RETURNS "public"."audit"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_offer  public.audit_offer;
  v_audit  public.audit;
  v_base   integer := public.base_audit_fee_minor_units();
begin
  select * into v_offer from public.audit_offer where id = p_offer_id for update;

  if v_offer.id is null then
    raise exception 'no such offer' using errcode = 'no_data_found';
  end if;
  if v_offer.auditor_id is distinct from auth.uid() then
    raise exception 'this offer is not yours' using errcode = 'insufficient_privilege';
  end if;
  if v_offer.outcome <> 'offered' then
    raise exception 'this offer is already %', v_offer.outcome using errcode = 'check_violation';
  end if;
  if v_offer.expires_at is not null and v_offer.expires_at < now() then
    raise exception 'this offer has expired' using errcode = 'check_violation';
  end if;

  -- Lock the audit before checking: two auditors accepting at the same instant
  -- must not both win.
  select * into v_audit from public.audit where id = v_offer.audit_id for update;
  if v_audit.status <> 'booked' then
    raise exception 'this audit is no longer available' using errcode = 'check_violation';
  end if;

  update public.audit_offer
     set outcome = 'accepted', responded_at = now()
   where id = p_offer_id;

  -- Everyone else finds out it is gone, rather than accepting into a wall.
  update public.audit_offer
     set outcome = 'withdrawn', responded_at = now()
   where audit_id = v_offer.audit_id and id <> p_offer_id and outcome = 'offered';

  update public.audit
     set auditor_id = v_offer.auditor_id,
         status = 'assigned',
         matched_at = now(),
         auditor_fee_minor_units = v_base + v_offer.travel_uplift_minor_units
   where id = v_offer.audit_id
  returning * into v_audit;

  -- Itemised, always: an auditor should be able to see what each part is for.
  insert into public.audit_pay_item (audit_id, kind, amount_minor_units, note)
  values (v_audit.id, 'base', v_base, 'Audit fee');

  if v_offer.travel_uplift_minor_units > 0 then
    insert into public.audit_pay_item (audit_id, kind, amount_minor_units, note)
    values (v_audit.id, 'travel', v_offer.travel_uplift_minor_units, 'Travel uplift');
  end if;

  return v_audit;
end;
$$;


ALTER FUNCTION "public"."accept_offer"("p_offer_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_transaction" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "delta" integer NOT NULL,
    "reason" "public"."credit_reason" NOT NULL,
    "audit_id" "uuid",
    "unit_price_minor_units" integer,
    "currency" character(3) DEFAULT 'GBP'::"bpchar" NOT NULL,
    "external_reference" "text",
    "note" "text",
    "created_by" "uuid",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_purchase_id" "uuid",
    "settles_transaction_id" "uuid",
    CONSTRAINT "booking_has_audit" CHECK ((("reason" <> 'reservation'::"public"."credit_reason") OR ("audit_id" IS NOT NULL))),
    CONSTRAINT "consumption_settles_a_reservation" CHECK ((("reason" <> 'consumption'::"public"."credit_reason") OR ("settles_transaction_id" IS NOT NULL))),
    CONSTRAINT "delta_non_zero_unless_settling" CHECK ((("delta" <> 0) OR ("reason" = 'consumption'::"public"."credit_reason")))
);


ALTER TABLE "public"."credit_transaction" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_credits"("p_organisation_id" "uuid", "p_delta" integer, "p_reason" "text") RETURNS "public"."credit_transaction"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_row public.credit_transaction;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may adjust credits'
      using errcode = 'insufficient_privilege';
  end if;
  if p_delta = 0 then
    raise exception 'an adjustment of zero records nothing'
      using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required for a credit adjustment'
      using errcode = 'check_violation';
  end if;

  -- A new row, never an edit. The ledger is evidence; the balance is the sum
  -- of what is shown, and a charity can add it up themselves.
  insert into public.credit_transaction (organisation_id, delta, reason, note, created_by)
  values (p_organisation_id, p_delta, 'adjustment', trim(p_reason), auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."adjust_credits"("p_organisation_id" "uuid", "p_delta" integer, "p_reason" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."risk_advisory" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "risk_id" "uuid" NOT NULL,
    "advised_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "advised_by" "uuid" NOT NULL,
    "channel" "text" DEFAULT 'email'::"text" NOT NULL,
    "content" "text" NOT NULL,
    "client_response" "public"."client_response",
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "advisory_content_not_empty" CHECK (("length"(TRIM(BOTH FROM "content")) > 0))
);


ALTER TABLE "public"."risk_advisory" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."advise_on_risk"("p_risk_id" "uuid", "p_content" "text", "p_channel" "text" DEFAULT 'email'::"text") RETURNS "public"."risk_advisory"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_advisory public.risk_advisory;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may advise on a risk'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_content), '') = '' then
    raise exception 'say what the client was told' using errcode = 'check_violation';
  end if;

  insert into public.risk_advisory (risk_id, advised_by, channel, content)
  values (p_risk_id, auth.uid(), p_channel, trim(p_content))
  returning * into v_advisory;

  update public.risk set status = 'advised'
   where id = p_risk_id and status = 'open';

  return v_advisory;
end;
$$;


ALTER FUNCTION "public"."advise_on_risk"("p_risk_id" "uuid", "p_content" "text", "p_channel" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auditor_profile" (
    "user_id" "uuid" NOT NULL,
    "approval_status" "public"."auditor_approval_status" DEFAULT 'pending'::"public"."auditor_approval_status" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "right_to_work_checked_on" "date",
    "dbs_checked_on" "date",
    "payout_reference" "text",
    "base_postcode" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "av_capable" boolean DEFAULT false NOT NULL,
    "base_place_id" "uuid",
    "max_travel_minutes" integer,
    "travel_mode" "public"."travel_mode",
    CONSTRAINT "approved_has_timestamp" CHECK ((("approval_status" <> 'approved'::"public"."auditor_approval_status") OR ("approved_at" IS NOT NULL))),
    CONSTRAINT "travel_minutes_sane" CHECK ((("max_travel_minutes" IS NULL) OR (("max_travel_minutes" >= 5) AND ("max_travel_minutes" <= 240))))
);


ALTER TABLE "public"."auditor_profile" OWNER TO "postgres";


COMMENT ON COLUMN "public"."auditor_profile"."max_travel_minutes" IS 'As the auditor gave it. The straight-line radius is derived from this and the mode, never stored in its place — so better journey times can replace the estimate without asking anyone again.';



CREATE OR REPLACE FUNCTION "public"."approve_auditor"("p_auditor_id" "uuid") RETURNS "public"."auditor_profile"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_profile public.auditor_profile;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may approve an auditor'
      using errcode = 'insufficient_privilege';
  end if;

  update public.auditor_profile
     set approval_status = 'approved', approved_at = now(), approved_by = auth.uid()
   where user_id = p_auditor_id
  returning * into v_profile;

  if v_profile.user_id is null then
    raise exception 'no such auditor' using errcode = 'no_data_found';
  end if;

  return v_profile;
end;
$$;


ALTER FUNCTION "public"."approve_auditor"("p_auditor_id" "uuid") OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payout_run_reference_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payout_run_reference_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payout_run" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "reference" "text" DEFAULT ('PR-'::"text" || "lpad"(("nextval"('"public"."payout_run_reference_seq"'::"regclass"))::"text", 5, '0'::"text")) NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "public"."payout_run_status" DEFAULT 'draft'::"public"."payout_run_status" NOT NULL,
    "execution_method" "public"."payout_execution_method" DEFAULT 'manual_csv'::"public"."payout_execution_method" NOT NULL,
    "currency" character(3) DEFAULT 'GBP'::"bpchar" NOT NULL,
    "total_minor_units" bigint DEFAULT 0 NOT NULL,
    "external_reference" "text",
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "executed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "period_ordered" CHECK (("period_end" >= "period_start"))
);


ALTER TABLE "public"."payout_run" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_payout_run"("p_run_id" "uuid") RETURNS "public"."payout_run"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_run public.payout_run;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may approve a payout run'
      using errcode = 'insufficient_privilege';
  end if;

  update public.payout_run
     set status = 'approved', approved_by = auth.uid(), approved_at = now()
   where id = p_run_id and status = 'draft'
  returning * into v_run;

  if v_run.id is null then
    raise exception 'only a draft run can be approved' using errcode = 'check_violation';
  end if;
  if v_run.total_minor_units = 0 then
    raise exception 'this run pays nothing' using errcode = 'check_violation';
  end if;

  return v_run;
end;
$$;


ALTER FUNCTION "public"."approve_payout_run"("p_run_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assignment_console"("p_audit_id" "uuid") RETURNS TABLE("auditor_id" "uuid", "eligible" boolean, "reasons" "text"[], "warnings" "public"."eligibility_flag"[], "offer_state" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with caller as (select app.is_admin() as ok),
  target as (
    select id, client_organisation_id, place_id, audit_type,
           window_start_on, window_end_on, requires_av
    from public.audit where id = p_audit_id
  ),
  history as (
    select a.auditor_id, max(a.window_end_on) as last_seen
    from public.audit a, target t
    where a.client_organisation_id = t.client_organisation_id
      and a.auditor_id is not null and a.id <> t.id
    group by a.auditor_id
  ),
  assessed as (
    select
      ap.user_id,
      ap.approval_status = 'approved' as approved,
      (not t.requires_av or ap.av_capable) as av_ok,
      exists (select 1 from public.auditor_coverage c
               where c.auditor_id = ap.user_id and c.place_id = t.place_id
                 and c.source <> 'excluded') as reachable,
      exists (select 1 from public.auditor_capability k
               where k.auditor_id = ap.user_id and k.audit_type = t.audit_type) as capable,
      not exists (select 1 from public.auditor_conflict f
                   where f.auditor_id = ap.user_id
                     and f.organisation_id = t.client_organisation_id) as no_conflict,
      (h.last_seen is null or h.last_seen < current_date - public.exposure_window_days()) as exposure_ok,
      not exists (select 1 from public.audit busy
                   where busy.auditor_id = ap.user_id and busy.id <> t.id
                     and busy.status in ('assigned', 'in_progress')
                     and busy.window_start_on <= t.window_end_on
                     and busy.window_end_on   >= t.window_start_on) as available,
      h.last_seen is not null as familiar,
      (select o.outcome::text from public.audit_offer o
        where o.audit_id = t.id and o.auditor_id = ap.user_id) as offer_state
    from public.auditor_profile ap
    cross join target t
    cross join caller
    left join history h on h.auditor_id = ap.user_id
    where caller.ok
  )
  select
    user_id,
    approved and av_ok and reachable and capable and no_conflict and exposure_ok and available,
    -- Only the reasons that actually applied, in the order an operator reads
    -- them: the blocking ones first.
    array_remove(array[
      case when not no_conflict  then 'Declared conflict with this charity' end,
      case when not approved     then 'Not approved' end,
      case when not reachable    then 'Does not cover this place' end,
      case when not capable      then 'Not signed off for this methodology' end,
      case when not av_ok        then 'No A/V capability, and the client asked for it' end,
      case when not exposure_ok  then 'Audited this charity too recently' end,
      case when not available    then 'Already committed in this window' end
    ], null),
    case when familiar and exposure_ok then array['familiarity']::public.eligibility_flag[]
         else '{}'::public.eligibility_flag[] end,
    offer_state
  from assessed
  order by 2 desc, 1;
$$;


ALTER FUNCTION "public"."assignment_console"("p_audit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_gate_state"("p_audit_id" "uuid") RETURNS TABLE("payment" "public"."review_gate_mode", "client_release" "public"."review_gate_mode")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with matched as (select * from public.matching_review_gates(p_audit_id)),
  ranked as (
    select
      scope,
      max(case mode when 'hold' then 2 when 'notify' then 1 else 0 end) as level
    from matched group by scope
  ),
  level_for as (
    select
      coalesce(max(level) filter (where scope in ('payment', 'both')), 0) as payment,
      coalesce(max(level) filter (where scope in ('client_release', 'both')), 0) as release
    from ranked
  )
  select
    (case payment when 2 then 'hold' when 1 then 'notify' else 'auto_approve' end)::public.review_gate_mode,
    (case release when 2 then 'hold' when 1 then 'notify' else 'auto_approve' end)::public.review_gate_mode
  from level_for
  -- Guarded in its own right rather than relying on the call above. A future
  -- edit that stops routing through `matching_review_gates` would otherwise
  -- reopen this silently, which is exactly how it happened the first time.
  where app.is_admin();
$$;


ALTER FUNCTION "public"."audit_gate_state"("p_audit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auditor_code_for"("p_auditor_id" "uuid", "p_organisation_id" "uuid") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select upper(substr(md5(p_auditor_id::text || ':' || p_organisation_id::text), 1, 6));
$$;


ALTER FUNCTION "public"."auditor_code_for"("p_auditor_id" "uuid", "p_organisation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auditor_roster"() RETURNS TABLE("auditor_id" "uuid", "full_name" "text", "email" "text", "approval_status" "public"."auditor_approval_status", "user_status" "public"."user_status", "approved_at" timestamp with time zone, "base_postcode" "text", "base_place" "text", "max_travel_minutes" integer, "travel_mode" "public"."travel_mode", "av_capable" boolean, "areas" "text"[], "audit_types" "public"."audit_type"[], "audits_completed" integer, "open_conflicts" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    p.user_id,
    u.full_name,
    u.email,
    p.approval_status,
    u.status,
    p.approved_at,
    p.base_postcode,
    bp.name,
    p.max_travel_minutes,
    p.travel_mode,
    p.av_capable,
    coalesce((select array_agg(pl.name order by pl.name)
              from public.auditor_coverage c
              join public.place pl on pl.id = c.place_id
              where c.auditor_id = p.user_id and c.source <> 'excluded'), '{}'),
    coalesce((select array_agg(k.audit_type order by k.audit_type)
              from public.auditor_capability k where k.auditor_id = p.user_id), '{}'),
    (select count(*)::integer from public.audit a
      where a.auditor_id = p.user_id and a.status = 'released'),
    (select count(*)::integer from public.auditor_conflict f where f.auditor_id = p.user_id)
  from public.auditor_profile p
  join public.user_profile u on u.id = p.user_id
  left join public.place bp on bp.id = p.base_place_id
  where app.is_admin()
  order by
    (case when u.status = 'invited' then 2
          when p.approval_status = 'pending' then 0
          else 1 end),
    u.full_name;
$$;


ALTER FUNCTION "public"."auditor_roster"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."base_audit_fee_minor_units"() RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$ select 10000 $$;


ALTER FUNCTION "public"."base_audit_fee_minor_units"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."book_audit"("p_organisation_id" "uuid", "p_audit_type" "public"."audit_type", "p_shift_payment_method" "public"."shift_payment_method", "p_postcode" "text", "p_place_id" "uuid", "p_window_start_on" "date", "p_window_end_on" "date", "p_site_name" "text" DEFAULT NULL::"text", "p_campaign_name" "text" DEFAULT NULL::"text", "p_requires_av" boolean DEFAULT false) RETURNS "public"."audit"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_caller   uuid := auth.uid();
  v_role     public.app_role;
  v_org      uuid;
  v_balance  integer;
  v_audit    public.audit;
  v_lead     integer := public.booking_lead_days();
  v_purchase public.credit_transaction;
begin
  if v_caller is null then
    raise exception 'not signed in' using errcode = 'insufficient_privilege';
  end if;

  select role, organisation_id into v_role, v_org
  from public.user_profile where id = v_caller;

  if v_role is distinct from 'pick_admin'
     and (v_role is distinct from 'client' or v_org is distinct from p_organisation_id) then
    raise exception 'not permitted to book for this organisation'
      using errcode = 'insufficient_privilege';
  end if;

  if p_window_end_on - p_window_start_on < 2 then
    raise exception 'the date window must cover at least three days'
      using errcode = 'check_violation';
  end if;

  if p_window_start_on < current_date + v_lead then
    raise exception 'the window must start at least % days from today', v_lead
      using errcode = 'check_violation';
  end if;

  -- Everything after this point is serialised per charity.
  perform 1 from public.organisation where id = p_organisation_id for update;

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_transaction where organisation_id = p_organisation_id;

  if v_balance < 1 then
    raise exception 'no credits available' using errcode = 'check_violation';
  end if;

  if p_place_id is null or not exists (select 1 from public.place where id = p_place_id) then
    raise exception 'an audit needs a place, so we know who can reach it'
      using errcode = 'check_violation';
  end if;

  insert into public.audit (
    client_organisation_id, status, audit_type, shift_payment_method,
    postcode, place_id, window_start_on, window_end_on, site_name, campaign_name,
    requires_av, created_by, requested_at
  ) values (
    p_organisation_id, 'booked', p_audit_type, p_shift_payment_method,
    p_postcode, p_place_id, p_window_start_on, p_window_end_on, p_site_name, p_campaign_name,
    p_requires_av, v_caller, now()
  ) returning * into v_audit;

  v_purchase := public.next_purchase_to_draw_from(p_organisation_id);

  -- The price is fixed at the moment the charity commits, not at release. It
  -- is also fairer: they know what this audit cost them when they book it.
  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id,
    unit_price_minor_units, source_purchase_id, created_by
  ) values (
    p_organisation_id, -1, 'reservation', v_audit.id,
    coalesce(v_purchase.unit_price_minor_units, public.single_credit_price_minor_units()),
    v_purchase.id, v_caller
  );

  return v_audit;
end;
$$;


ALTER FUNCTION "public"."book_audit"("p_organisation_id" "uuid", "p_audit_type" "public"."audit_type", "p_shift_payment_method" "public"."shift_payment_method", "p_postcode" "text", "p_place_id" "uuid", "p_window_start_on" "date", "p_window_end_on" "date", "p_site_name" "text", "p_campaign_name" "text", "p_requires_av" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."booking_lead_days"() RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$ select 5 $$;


ALTER FUNCTION "public"."booking_lead_days"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."build_payout_run"("p_period_start" "date", "p_period_end" "date") RETURNS "public"."payout_run"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_run   public.payout_run;
  v_total bigint := 0;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may build a payout run'
      using errcode = 'insufficient_privilege';
  end if;
  if p_period_end < p_period_start then
    raise exception 'the period ends before it starts' using errcode = 'check_violation';
  end if;

  insert into public.payout_run (period_start, period_end, created_by)
  values (p_period_start, p_period_end, auth.uid())
  returning * into v_run;

  insert into public.payout_line_item (
    payout_run_id, auditor_id, audit_id, amount_minor_units, description
  )
  select
    v_run.id, pa.auditor_id, pa.audit_id, pa.amount_minor_units,
    pa.reference || ' — ' || to_char(pa.completed_at, 'DD Mon YYYY')
  from public.payable_audits() pa
  where pa.gate <> 'hold'
    and pa.completed_at::date between p_period_start and p_period_end;

  select coalesce(sum(amount_minor_units), 0) into v_total
  from public.payout_line_item where payout_run_id = v_run.id;

  update public.payout_run set total_minor_units = v_total where id = v_run.id
  returning * into v_run;

  return v_run;
end;
$$;


ALTER FUNCTION "public"."build_payout_run"("p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."client_roster"() RETURNS TABLE("organisation_id" "uuid", "name" "text", "residency_zone" "public"."residency_zone", "charity_number" "text", "is_active" boolean, "balance" integer, "members" integer, "audits_booked" integer, "audits_released" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    o.id,
    o.name,
    o.residency_zone,
    o.charity_number,
    o.is_active,
    coalesce((select sum(t.delta)::integer from public.credit_transaction t
              where t.organisation_id = o.id), 0),
    (select count(*)::integer from public.user_profile u where u.organisation_id = o.id),
    (select count(*)::integer from public.audit a where a.client_organisation_id = o.id),
    (select count(*)::integer from public.audit a
      where a.client_organisation_id = o.id and a.status = 'released')
  from public.organisation o
  where app.is_admin() and o.org_type = 'charity'
  order by o.name
$$;


ALTER FUNCTION "public"."client_roster"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_auditor_profile"("p_full_name" "text", "p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_audit_types" "public"."audit_type"[], "p_av_capable" boolean DEFAULT false) RETURNS "public"."auditor_profile"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user    uuid := auth.uid();
  v_profile public.auditor_profile;
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.user_profile
    where id = v_user and role = 'auditor' and status = 'invited'
  ) then
    raise exception 'this invitation has already been used, or is not yours'
      using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'we need a name to put on the roster' using errcode = 'check_violation';
  end if;

  if p_base_place_id is null then
    raise exception 'we need to know where you set out from' using errcode = 'check_violation';
  end if;

  if coalesce(array_length(p_place_ids, 1), 0) = 0 then
    raise exception 'an auditor works somewhere — pick at least one place'
      using errcode = 'check_violation';
  end if;

  if coalesce(array_length(p_audit_types, 1), 0) = 0 then
    raise exception 'an auditor runs at least one kind of audit'
      using errcode = 'check_violation';
  end if;

  update public.user_profile
     set full_name = trim(p_full_name),
         status    = 'active'
   where id = v_user;

  update public.auditor_profile
     set base_place_id      = p_base_place_id,
         max_travel_minutes = p_minutes,
         travel_mode        = p_mode,
         av_capable         = coalesce(p_av_capable, false)
   where user_id = v_user
  returning * into v_profile;

  delete from public.auditor_coverage where auditor_id = v_user;
  insert into public.auditor_coverage (auditor_id, place_id, source)
  select v_user, id, 'derived' from unnest(p_place_ids) as id
  on conflict do nothing;

  delete from public.auditor_capability where auditor_id = v_user;
  insert into public.auditor_capability (auditor_id, audit_type)
  select distinct v_user, t from unnest(p_audit_types) as t;

  return v_profile;
end;
$$;


ALTER FUNCTION "public"."complete_auditor_profile"("p_full_name" "text", "p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_audit_types" "public"."audit_type"[], "p_av_capable" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_credit_for"("p_audit_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_reservation public.credit_transaction;
begin
  select * into v_reservation
  from public.credit_transaction
  where audit_id = p_audit_id and reason = 'reservation';

  -- Nothing to settle: an audit booked before this lifecycle existed, or one
  -- whose reservation was already handed back. Silent by design — releasing an
  -- audit must not fail over bookkeeping.
  if v_reservation.id is null then return; end if;
  if exists (select 1 from public.credit_transaction
             where settles_transaction_id = v_reservation.id) then
    return;
  end if;

  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id,
    unit_price_minor_units, source_purchase_id, settles_transaction_id, created_by
  ) values (
    v_reservation.organisation_id, 0, 'consumption', p_audit_id,
    v_reservation.unit_price_minor_units, v_reservation.source_purchase_id,
    v_reservation.id, auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."consume_credit_for"("p_audit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decline_offer"("p_offer_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_offer public.audit_offer;
begin
  select * into v_offer from public.audit_offer where id = p_offer_id for update;

  if v_offer.id is null then
    raise exception 'no such offer' using errcode = 'no_data_found';
  end if;
  if v_offer.auditor_id is distinct from auth.uid() then
    raise exception 'this offer is not yours' using errcode = 'insufficient_privilege';
  end if;
  if v_offer.outcome <> 'offered' then
    raise exception 'this offer is already %', v_offer.outcome using errcode = 'check_violation';
  end if;

  update public.audit_offer
     set outcome = 'declined', responded_at = now(), decline_reason = p_reason
   where id = p_offer_id;
end;
$$;


ALTER FUNCTION "public"."decline_offer"("p_offer_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."default_travel_uplift_minor_units"() RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$ select 1500 $$;


ALTER FUNCTION "public"."default_travel_uplift_minor_units"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."distance_km"("p_lat_a" double precision, "p_lng_a" double precision, "p_lat_b" double precision, "p_lng_b" double precision) RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(p_lat_b - p_lat_a) / 2), 2) +
    cos(radians(p_lat_a)) * cos(radians(p_lat_b)) *
    power(sin(radians(p_lng_b - p_lng_a) / 2), 2)
  ));
$$;


ALTER FUNCTION "public"."distance_km"("p_lat_a" double precision, "p_lng_a" double precision, "p_lat_b" double precision, "p_lng_b" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."eligible_auditors"("p_audit_id" "uuid") RETURNS TABLE("auditor_id" "uuid", "match_reason" "text", "warnings" "public"."eligibility_flag"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with allowed as (select app.is_admin() as ok),
  target as (
    select a.id, a.client_organisation_id, a.place_id, a.audit_type,
           a.window_start_on, a.window_end_on, a.requires_av,
           p.name as place_name
    from public.audit a
    left join public.place p on p.id = a.place_id
    where a.id = p_audit_id
  ),
  history as (
    select a.auditor_id, max(a.window_end_on) as last_seen
    from public.audit a, target t
    where a.client_organisation_id = t.client_organisation_id
      and a.auditor_id is not null and a.id <> t.id
    group by a.auditor_id
  )
  select
    ap.user_id,
    format('covers %s, approved, capable of %s%s', t.place_name, t.audit_type,
           case when t.requires_av then ', A/V equipped' else '' end),
    case when h.last_seen is not null
         then array['familiarity']::public.eligibility_flag[]
         else '{}'::public.eligibility_flag[] end
  from public.auditor_profile ap
  cross join target t
  cross join allowed
  left join history h on h.auditor_id = ap.user_id
  where
    allowed.ok
    -- An audit with no place resolved cannot be matched to anybody. Visible as
    -- an empty console rather than a silently wrong offer.
    and t.place_id is not null
    and ap.approval_status = 'approved'
    and (not t.requires_av or ap.av_capable)
    and exists (
      select 1 from public.auditor_coverage c
      where c.auditor_id = ap.user_id
        and c.place_id = t.place_id
        and c.source <> 'excluded'
    )
    and exists (
      select 1 from public.auditor_capability k
      where k.auditor_id = ap.user_id and k.audit_type = t.audit_type
    )
    and not exists (
      select 1 from public.auditor_conflict f
      where f.auditor_id = ap.user_id and f.organisation_id = t.client_organisation_id
    )
    and (h.last_seen is null or h.last_seen < current_date - public.exposure_window_days())
    and not exists (
      select 1 from public.audit busy
      where busy.auditor_id = ap.user_id and busy.id <> t.id
        and busy.status in ('assigned', 'in_progress')
        and busy.window_start_on <= t.window_end_on
        and busy.window_end_on   >= t.window_start_on
    )
    and not exists (
      select 1 from public.audit_offer o
      where o.audit_id = t.id and o.auditor_id = ap.user_id
        and o.outcome in ('offered', 'accepted')
    );
$$;


ALTER FUNCTION "public"."eligible_auditors"("p_audit_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."eligible_auditors"("p_audit_id" "uuid") IS 'S1.2 — the six eligibility sets, as one query. Returns match reason and warnings.';



CREATE OR REPLACE FUNCTION "public"."execute_payout_run"("p_run_id" "uuid", "p_external_reference" "text") RETURNS "public"."payout_run"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_run public.payout_run;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may execute a payout run'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_external_reference), '') = '' then
    raise exception 'record the reference the payment was made under'
      using errcode = 'check_violation';
  end if;

  update public.payout_run
     set status = 'executed', executed_at = now(), external_reference = trim(p_external_reference)
   where id = p_run_id and status = 'approved'
  returning * into v_run;

  if v_run.id is null then
    raise exception 'only an approved run can be executed' using errcode = 'check_violation';
  end if;

  update public.payout_line_item
     set status = 'paid', external_reference = trim(p_external_reference)
   where payout_run_id = p_run_id and status = 'pending';

  return v_run;
end;
$$;


ALTER FUNCTION "public"."execute_payout_run"("p_run_id" "uuid", "p_external_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."exposure_window_days"() RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$ select 90 $$;


ALTER FUNCTION "public"."exposure_window_days"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_report_read"("p_audit_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
begin
  -- Only the charity that paid for it, and only once it has a report to read.
  -- An admin viewing a report is not the charity reading it, so this
  -- deliberately does nothing for them: the receipt would be a lie.
  update public.audit
     set report_read_at = now()
   where id = p_audit_id
     and status = 'released'
     and report_read_at is null
     and client_organisation_id = app.current_org();
end;
$$;


ALTER FUNCTION "public"."mark_report_read"("p_audit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."matching_review_gates"("p_audit_id" "uuid") RETURNS TABLE("trigger" "public"."review_gate_trigger", "mode" "public"."review_gate_mode", "scope" "public"."review_gate_scope", "reason" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with a as (select * from public.audit where id = p_audit_id)
  select g.trigger, g.mode, g.scope, r.reason
  from public.review_gate g
  join lateral (
    select case g.trigger
      when 'auditor_first_n_audits' then (
        select format('Auditor''s first %s audits are reviewed. This is number %s.',
                      coalesce(g.threshold, 3), c.released + 1)
        from a
        cross join lateral (
          select count(*) as released from public.audit x
          where x.auditor_id = a.auditor_id and x.status = 'released' and x.id <> a.id
        ) c
        where a.auditor_id is not null and c.released < coalesce(g.threshold, 3)
      )
      when 'auditor_first_of_type' then (
        select format('Auditor''s first %s audit.', a.audit_type)
        from a
        where a.auditor_id is not null and not exists (
          select 1 from public.audit x
          where x.auditor_id = a.auditor_id and x.audit_type = a.audit_type
            and x.status = 'released' and x.id <> a.id
        )
      )
      when 'client_first_audit' then (
        select 'First audit for this charity.'
        from a
        where not exists (
          select 1 from public.audit x
          where x.client_organisation_id = a.client_organisation_id
            and x.status = 'released' and x.id <> a.id
        )
      )
      when 'audit_type_is_lottery' then (
        select 'Lottery fundraising carries external regulatory exposure.'
        from a where a.audit_type = 'lottery'
      )
      when 'assignment_has_open_risk' then (
        select format('%s open risk(s) recorded against this assignment.', count(*))
        from public.risk
        where subject_type = 'assignment' and subject_id = p_audit_id
          and status in ('open', 'advised')
        having count(*) > 0
      )
      when 'manual' then (
        select 'Flagged for review by PICK.' from a where a.review_note is not null
      )
    end as reason
  ) r on r.reason is not null
  -- The guard. Everything above is unchanged; this line is the fix.
  where g.enabled and app.is_admin();
$$;


ALTER FUNCTION "public"."matching_review_gates"("p_audit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_purchase_to_draw_from"("p_organisation_id" "uuid") RETURNS "public"."credit_transaction"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select p.*
  from public.credit_transaction p
  where p.organisation_id = p_organisation_id
    and p.reason = 'purchase'
    and p.delta > (
      select coalesce(count(*), 0)
      from public.credit_transaction r
      where r.source_purchase_id = p.id
        and r.reason = 'reservation'
        and not exists (
          select 1 from public.credit_transaction rel
          where rel.settles_transaction_id = r.id and rel.reason = 'release'
        )
    )
  order by p.occurred_at, p.id
  limit 1
$$;


ALTER FUNCTION "public"."next_purchase_to_draw_from"("p_organisation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."offer_audit"("p_audit_id" "uuid", "p_expires_in" interval DEFAULT '24:00:00'::interval) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_status public.audit_status;
  v_count  integer;
begin
  -- Offering work is PICK's job. Without this an auditor could hand
  -- themselves any booked audit in the network.
  if not app.is_admin() then
    raise exception 'only PICK admin may offer an audit'
      using errcode = 'insufficient_privilege';
  end if;

  select status into v_status from public.audit where id = p_audit_id;
  if v_status is null then
    raise exception 'no such audit' using errcode = 'no_data_found';
  end if;
  if v_status <> 'booked' then
    raise exception 'only a booked audit can be offered (this one is %)', v_status
      using errcode = 'check_violation';
  end if;

  insert into public.audit_offer (audit_id, auditor_id, match_reason, warnings, expires_at)
  select p_audit_id, e.auditor_id, e.match_reason, e.warnings, now() + p_expires_in
  from public.eligible_auditors(p_audit_id) e;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."offer_audit"("p_audit_id" "uuid", "p_expires_in" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."offer_board"() RETURNS TABLE("offer_id" "uuid", "audit_id" "uuid", "audit_type" "public"."audit_type", "shift_payment_method" "public"."shift_payment_method", "postcode_outward" "text", "window_start_on" "date", "window_end_on" "date", "requires_av" boolean, "base_minor_units" integer, "travel_uplift_minor_units" integer, "expires_at" timestamp with time zone, "outcome" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    o.id,
    a.id,
    a.audit_type,
    a.shift_payment_method,
    a.postcode_outward,
    a.window_start_on,
    a.window_end_on,
    a.requires_av,
    public.base_audit_fee_minor_units(),
    o.travel_uplift_minor_units,
    o.expires_at,
    o.outcome::text
  from public.audit_offer o
  join public.audit a on a.id = o.audit_id
  where o.auditor_id = auth.uid()
  order by o.expires_at nulls last, o.created_at desc
$$;


ALTER FUNCTION "public"."offer_board"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ops_counters"() RETURNS TABLE("needs_a_human" integer, "in_flight_today" integer, "offers_awaiting" integer, "released_this_week" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    (select count(*)::integer from public.ops_queue()),
    (select count(*)::integer from public.audit
      where status in ('assigned', 'in_progress')
        and current_date between window_start_on and window_end_on),
    (select count(*)::integer from public.audit_offer where outcome = 'offered'),
    (select count(*)::integer from public.audit
      where status = 'released' and released_at > now() - interval '7 days')
  where app.is_admin();
$$;


ALTER FUNCTION "public"."ops_counters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ops_queue"() RETURNS TABLE("kind" "public"."ops_item_kind", "rank" integer, "reference" "text", "summary" "text", "target_id" "uuid", "since" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with caller as (select app.is_admin() as ok)
  -- An offer nobody has taken, on an audit whose window is close.
  select 'offer_expiring'::public.ops_item_kind, 1, a.reference,
         format('%s · %s — %s decline%s, window starts %s',
                a.postcode, a.audit_type,
                (select count(*) from public.audit_offer d
                  where d.audit_id = a.id and d.outcome = 'declined'),
                case when (select count(*) from public.audit_offer d
                            where d.audit_id = a.id and d.outcome = 'declined') = 1 then '' else 's' end,
                to_char(a.window_start_on, 'FMDay DD Mon')),
         a.id, a.requested_at
  from public.audit a, caller
  where caller.ok and a.status = 'booked'
    and a.window_start_on <= current_date + 2

  union all
  -- Held for review. The gate reason is on the review screen itself.
  select 'review_gate', 2, a.reference,
         format('%s · %s — submitted %s', a.postcode, a.audit_type,
                to_char(a.submitted_at, 'DD Mon HH24:MI')),
         a.id, a.submitted_at
  from public.audit a, caller
  where caller.ok and a.status = 'in_review'

  union all
  select 'no_show', 3, a.reference,
         format('%s · %s — verify, notify the charity, credit returned',
                a.postcode, a.audit_type),
         a.id, a.no_team_present_at
  from public.audit a, caller
  where caller.ok and a.status = 'no_team_present' and a.no_team_present_at > now() - interval '7 days'

  union all
  select 'complaint', 4, 'CMP',
         format('%s — %s', o.name,
                case c.subject when 'about_audit' then 'about the audit'
                               else 'about a fundraiser' end),
         c.id, c.raised_at
  from public.complaint c
  join public.organisation o on o.id = c.organisation_id, caller
  where caller.ok and c.status = 'open'

  union all
  select 'vetting', 5, 'AUD',
         format('%s auditor application%s waiting',
                count(*), case when count(*) = 1 then '' else 's' end),
         null::uuid, min(ap.created_at)
  from public.auditor_profile ap
  join public.user_profile u on u.id = ap.user_id, caller
  where caller.ok and ap.approval_status = 'pending'
    -- Somebody who has not opened their invitation has not applied. Counting
    -- them sends an admin to a queue with nothing in it they can act on.
    and u.status <> 'invited'
  group by caller.ok
  having count(*) > 0

  union all
  -- The shift is over and the write-up has not arrived.
  select 'stale_write_up', 6, a.reference,
         format('%s · write-up due %s hours after the shift',
                a.postcode, public.write_up_due_hours()),
         a.id, a.window_end_on::timestamptz
  from public.audit a, caller
  where caller.ok and a.status in ('assigned', 'in_progress')
    and a.window_end_on < current_date
    and a.window_end_on::timestamptz < now() - make_interval(hours => public.write_up_due_hours())

  order by 2, 6;
$$;


ALTER FUNCTION "public"."ops_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."payable_audits"() RETURNS TABLE("audit_id" "uuid", "reference" "text", "auditor_id" "uuid", "auditor_name" "text", "amount_minor_units" bigint, "completed_at" timestamp with time zone, "gate" "public"."review_gate_mode")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select
    a.id,
    a.reference,
    a.auditor_id,
    u.full_name,
    sum(p.amount_minor_units)::bigint,
    a.completed_at,
    (public.audit_gate_state(a.id)).payment
  from public.audit a
  join public.audit_pay_item p on p.audit_id = a.id
  join public.user_profile u on u.id = a.auditor_id
  where app.is_admin()
    and a.auditor_id is not null
    -- Terminal for pay purposes. A no-show is included on purpose: the
    -- auditor travelled and waited, and is paid in full.
    and a.status in ('released', 'no_team_present')
    and not exists (
      select 1 from public.payout_line_item l where l.audit_id = a.id
    )
  group by a.id, a.reference, a.auditor_id, u.full_name, a.completed_at
  order by a.completed_at nulls last, a.reference
$$;


ALTER FUNCTION "public"."payable_audits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."places_within_reach"("p_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode") RETURNS TABLE("place_id" "uuid", "name" "text", "region" "text", "minutes" integer)
    LANGUAGE "sql" STABLE
    AS $$
  select
    p.id,
    p.name,
    p.region,
    greatest(1, round(
      public.distance_km(origin.latitude, origin.longitude, p.latitude, p.longitude)
      / public.travel_km_per_minute(p_mode)
    )::integer)
  from public.place p
  cross join (select latitude, longitude, country_code from public.place where id = p_place_id) origin
  where p.country_code = origin.country_code
    and public.distance_km(origin.latitude, origin.longitude, p.latitude, p.longitude)
        <= p_minutes * public.travel_km_per_minute(p_mode)
  order by 4, 2;
$$;


ALTER FUNCTION "public"."places_within_reach"("p_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prefer_auditor"("p_audit_id" "uuid", "p_code" "text") RETURNS "public"."audit"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_audit    public.audit;
  v_auditor  uuid;
  v_familiar boolean;
  v_risk     public.risk;
begin
  select * into v_audit from public.audit where id = p_audit_id for update;
  if v_audit.id is null then
    raise exception 'no such audit' using errcode = 'no_data_found';
  end if;
  if not app.is_admin() and v_audit.client_organisation_id is distinct from app.current_org() then
    raise exception 'not your audit' using errcode = 'insufficient_privilege';
  end if;
  if v_audit.status <> 'booked' then
    raise exception 'an auditor can only be preferred before the audit is assigned'
      using errcode = 'check_violation';
  end if;

  select ap.user_id into v_auditor
  from public.auditor_profile ap
  where public.auditor_code_for(ap.user_id, v_audit.client_organisation_id) = upper(p_code);

  if v_auditor is null then
    raise exception 'no auditor with that code' using errcode = 'no_data_found';
  end if;

  -- Hard block. Unchanged, and deliberately unwaivable.
  if exists (
    select 1 from public.auditor_conflict
    where auditor_id = v_auditor and organisation_id = v_audit.client_organisation_id
  ) then
    raise exception 'that auditor has a declared conflict with your organisation'
      using errcode = 'check_violation';
  end if;

  -- Soft. Has this auditor seen this charity's teams inside the exposure
  -- window? If so they are becoming recognisable, which degrades the audit
  -- without invalidating it.
  select exists (
    select 1 from public.audit a
    where a.auditor_id = v_auditor
      and a.client_organisation_id = v_audit.client_organisation_id
      and a.completed_at > now() - make_interval(days => public.exposure_window_days())
  ) into v_familiar;

  if v_familiar then
    v_risk := public.raise_risk(
      'exposure',
      'assignment',
      p_audit_id,
      format(
        'Client chose auditor %s, who has audited them within the last %s days. '
        || 'Repeat exposure makes an auditor recognisable to the team being observed.',
        upper(p_code), public.exposure_window_days()
      ),
      'medium',
      v_audit.client_organisation_id
    );
  end if;

  update public.audit set preferred_auditor_id = v_auditor where id = p_audit_id
  returning * into v_audit;

  insert into public.assignment_override (
    audit_id, chosen_auditor_id, overridden_by, risk_id
  ) values (
    p_audit_id, v_auditor, auth.uid(), v_risk.id
  );

  return v_audit;
end;
$$;


ALTER FUNCTION "public"."prefer_auditor"("p_audit_id" "uuid", "p_code" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."risk" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "type" "public"."risk_type" NOT NULL,
    "severity" "public"."risk_severity" DEFAULT 'medium'::"public"."risk_severity" NOT NULL,
    "subject_type" "public"."risk_subject" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "organisation_id" "uuid",
    "status" "public"."risk_status" DEFAULT 'open'::"public"."risk_status" NOT NULL,
    "raised_by" "public"."risk_source" DEFAULT 'system'::"public"."risk_source" NOT NULL,
    "raised_by_id" "uuid",
    "raised_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "detail" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "risk_detail_not_empty" CHECK (("length"(TRIM(BOTH FROM "detail")) > 0)),
    CONSTRAINT "risk_user_raised_has_actor" CHECK ((("raised_by" <> 'user'::"public"."risk_source") OR ("raised_by_id" IS NOT NULL)))
);


ALTER TABLE "public"."risk" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."raise_risk"("p_type" "public"."risk_type", "p_subject_type" "public"."risk_subject", "p_subject_id" "uuid", "p_detail" "text", "p_severity" "public"."risk_severity" DEFAULT 'medium'::"public"."risk_severity", "p_organisation_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."risk"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_risk public.risk;
begin
  if coalesce(trim(p_detail), '') = '' then
    raise exception 'a risk needs a description' using errcode = 'check_violation';
  end if;

  insert into public.risk (
    type, subject_type, subject_id, detail, severity, organisation_id,
    raised_by, raised_by_id
  ) values (
    p_type, p_subject_type, p_subject_id, trim(p_detail), p_severity, p_organisation_id,
    (case when auth.uid() is null then 'system' else 'user' end)::public.risk_source,
    auth.uid()
  ) returning * into v_risk;

  return v_risk;
end;
$$;


ALTER FUNCTION "public"."raise_risk"("p_type" "public"."risk_type", "p_subject_type" "public"."risk_subject", "p_subject_id" "uuid", "p_detail" "text", "p_severity" "public"."risk_severity", "p_organisation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_audit"("p_audit_id" "uuid") RETURNS "public"."audit"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_audit public.audit;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may release an audit'
      using errcode = 'insufficient_privilege';
  end if;

  update public.audit
     set status = 'released', released_at = now(), released_by = auth.uid(),
         completed_at = now()
   where id = p_audit_id and status = 'in_review'
  returning * into v_audit;

  if v_audit.id is null then
    raise exception 'only an audit in review can be released' using errcode = 'check_violation';
  end if;

  -- The client has the audit they booked. This is the moment the credit is
  -- actually spent, rather than at booking.
  perform public.consume_credit_for(p_audit_id);

  return v_audit;
end;
$$;


ALTER FUNCTION "public"."release_audit"("p_audit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_credit_for"("p_audit_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_reservation public.credit_transaction;
begin
  select * into v_reservation
  from public.credit_transaction
  where audit_id = p_audit_id and reason = 'reservation';

  if v_reservation.id is null then return; end if;
  if exists (select 1 from public.credit_transaction
             where settles_transaction_id = v_reservation.id) then
    return;
  end if;

  insert into public.credit_transaction (
    organisation_id, delta, reason, audit_id,
    unit_price_minor_units, source_purchase_id, settles_transaction_id, note, created_by
  ) values (
    v_reservation.organisation_id, 1, 'release', p_audit_id,
    v_reservation.unit_price_minor_units, v_reservation.source_purchase_id,
    v_reservation.id, p_reason, auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."release_credit_for"("p_audit_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."report_no_team_present"("p_audit_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."audit"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_audit public.audit;
begin
  select * into v_audit from public.audit where id = p_audit_id for update;

  if v_audit.id is null then
    raise exception 'no such audit' using errcode = 'no_data_found';
  end if;
  if v_audit.auditor_id is distinct from auth.uid() and not app.is_admin() then
    raise exception 'this audit is not yours' using errcode = 'insufficient_privilege';
  end if;
  if v_audit.status not in ('assigned', 'in_progress') then
    raise exception 'this audit cannot be reported as no-show from %', v_audit.status
      using errcode = 'check_violation';
  end if;

  update public.audit
     set status = 'no_team_present', no_team_present_at = now(), completed_at = now()
   where id = p_audit_id
  returning * into v_audit;

  -- Paid in full: they travelled and waited. PICK absorbs this.
  insert into public.audit_pay_item (audit_id, kind, amount_minor_units, note)
  values (p_audit_id, 'no_show',
          coalesce(v_audit.auditor_fee_minor_units, public.base_audit_fee_minor_units()),
          coalesce(p_note, 'No team present'));

  -- The client is not charged for an audit that never happened.
  perform public.release_credit_for(p_audit_id, 'No team present');

  return v_audit;
end;
$$;


ALTER FUNCTION "public"."report_no_team_present"("p_audit_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."return_write_up"("p_audit_id" "uuid", "p_moments" "public"."audit_moment"[], "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."audit"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_audit public.audit;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may return a write-up'
      using errcode = 'insufficient_privilege';
  end if;
  if array_length(p_moments, 1) is null then
    raise exception 'say which moments need rework' using errcode = 'check_violation';
  end if;

  update public.audit
     set status = 'in_progress',
         returned_moments = p_moments,
         returned_at = now(),
         review_note = p_note
   where id = p_audit_id and status = 'in_review'
  returning * into v_audit;

  if v_audit.id is null then
    raise exception 'only an audit in review can be returned' using errcode = 'check_violation';
  end if;

  return v_audit;
end;
$$;


ALTER FUNCTION "public"."return_write_up"("p_audit_id" "uuid", "p_moments" "public"."audit_moment"[], "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_gate_audits"() RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$ select 3 $$;


ALTER FUNCTION "public"."review_gate_audits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_gate_reason"("p_audit_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  select string_agg(reason, ' ')
  from public.matching_review_gates(p_audit_id)
  where app.is_admin()
$$;


ALTER FUNCTION "public"."review_gate_reason"("p_audit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."selectable_auditors"("p_organisation_id" "uuid", "p_place_id" "uuid", "p_audit_type" "public"."audit_type", "p_requires_av" boolean DEFAULT false) RETURNS TABLE("code" "text", "state" "text", "audits_completed" integer, "av_capable" boolean, "warning" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with caller as (
    select app.is_admin() as is_admin, app.current_org() as org
  ),
  recent as (
    select a.auditor_id, count(*) as seen
    from public.audit a
    where a.client_organisation_id = p_organisation_id
      and a.auditor_id is not null
      and a.window_end_on > current_date - 60
    group by a.auditor_id
  )
  select
    public.auditor_code_for(ap.user_id, p_organisation_id),
    case
      when cf.auditor_id is not null then 'blocked'
      when r.seen is not null then 'familiarity'
      else 'available'
    end,
    (select count(*)::integer from public.audit d
      where d.auditor_id = ap.user_id and d.status = 'released'),
    ap.av_capable,
    case
      when cf.auditor_id is not null
        then 'Cannot be selected — a declared conflict with your organisation.'
      when r.seen is not null
        then format(
          'Familiarity warning — has audited your teams %s times in 60 days. You can proceed; PICK will follow up on rotation.',
          r.seen
        )
      else null
    end
  from public.auditor_profile ap
  cross join caller
  left join recent r on r.auditor_id = ap.user_id
  left join public.auditor_conflict cf
    on cf.auditor_id = ap.user_id and cf.organisation_id = p_organisation_id
  where
    -- A charity may only look at its own pool.
    (caller.is_admin or caller.org = p_organisation_id)
    and ap.approval_status = 'approved'
    and (not p_requires_av or ap.av_capable)
    and exists (
      select 1 from public.auditor_coverage c
      where c.auditor_id = ap.user_id and c.place_id = p_place_id and c.source <> 'excluded'
    )
    and exists (
      select 1 from public.auditor_capability k
      where k.auditor_id = ap.user_id and k.audit_type = p_audit_type
    )
  order by 3 desc;
$$;


ALTER FUNCTION "public"."selectable_auditors"("p_organisation_id" "uuid", "p_place_id" "uuid", "p_audit_type" "public"."audit_type", "p_requires_av" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_auditor_coverage"("p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_excluded_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_user  uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.auditor_profile where user_id = v_user) then
    raise exception 'only an auditor has coverage' using errcode = 'insufficient_privilege';
  end if;

  if coalesce(array_length(p_place_ids, 1), 0) = 0 then
    raise exception 'an auditor works somewhere — pick at least one place'
      using errcode = 'check_violation';
  end if;

  update public.auditor_profile
     set base_place_id      = p_base_place_id,
         max_travel_minutes = p_minutes,
         travel_mode        = p_mode
   where user_id = v_user;

  -- Replaced wholesale: this is a statement of where they work now, and a
  -- place dropped from the list is one they no longer cover.
  delete from public.auditor_coverage where auditor_id = v_user;

  insert into public.auditor_coverage (auditor_id, place_id, source)
  select v_user, id, 'derived' from unnest(p_place_ids) as id
  on conflict do nothing;

  -- An exclusion only means something for a place they did not also keep.
  insert into public.auditor_coverage (auditor_id, place_id, source)
  select v_user, e.id, 'excluded'
  from unnest(p_excluded_ids) as e(id)
  where not exists (select 1 from unnest(p_place_ids) as k(id) where k.id = e.id)
  on conflict do nothing;

  select count(*) into v_count
  from public.auditor_coverage
  where auditor_id = v_user and source <> 'excluded';

  return v_count;
end;
$$;


ALTER FUNCTION "public"."set_auditor_coverage"("p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_excluded_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_write_up"("p_audit_id" "uuid", "p_results" "jsonb") RETURNS "public"."audit"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_audit    public.audit;
  v_expected integer;
  v_given    integer;
begin
  select * into v_audit from public.audit where id = p_audit_id for update;

  if v_audit.id is null then
    raise exception 'no such audit' using errcode = 'no_data_found';
  end if;
  if v_audit.auditor_id is distinct from auth.uid() then
    raise exception 'this audit is not yours' using errcode = 'insufficient_privilege';
  end if;
  if v_audit.status not in ('assigned', 'in_progress') then
    raise exception 'this audit cannot be written up from %', v_audit.status
      using errcode = 'check_violation';
  end if;

  -- Every check in the catalogue version this audit was pinned to must have a
  -- verdict. A partial write-up is not an audit, and PICK cannot review what
  -- is not there.
  select count(*) into v_expected
  from public.check_definition
  where version = v_audit.check_set_version and is_active;

  select count(distinct (r ->> 'check_definition_id')) into v_given
  from jsonb_array_elements(p_results) r;

  if v_given < v_expected then
    raise exception 'write-up is incomplete: % of % checks answered', v_given, v_expected
      using errcode = 'check_violation';
  end if;

  -- Ids come from the device, so re-submitting after a dropped connection
  -- lands on the same rows instead of duplicating the audit.
  insert into public.check_result (
    id, audit_id, check_definition_id, auditor_id, outcome, note, occurred_at
  )
  select
    (r ->> 'id')::uuid,
    p_audit_id,
    (r ->> 'check_definition_id')::uuid,
    v_audit.auditor_id,
    (r ->> 'outcome')::public.check_outcome,
    nullif(r ->> 'note', ''),
    coalesce((r ->> 'occurred_at')::timestamptz, now())
  from jsonb_array_elements(p_results) r
  on conflict (id) do nothing;

  update public.audit
     set status = 'in_review',
         submitted_at = now(),
         returned_moments = '{}',
         returned_at = null
   where id = p_audit_id
  returning * into v_audit;

  return v_audit;
end;
$$;


ALTER FUNCTION "public"."submit_write_up"("p_audit_id" "uuid", "p_results" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."suspend_auditor"("p_auditor_id" "uuid", "p_reason" "text") RETURNS "public"."auditor_profile"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_profile public.auditor_profile;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may suspend an auditor'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'a reason is required to suspend an auditor'
      using errcode = 'check_violation';
  end if;

  -- Suspending stops future offers. It deliberately does not touch audits
  -- already accepted: the auditor still did that work and is still owed for it.
  update public.auditor_profile
     set approval_status = 'suspended'
   where user_id = p_auditor_id
  returning * into v_profile;

  if v_profile.user_id is null then
    raise exception 'no such auditor' using errcode = 'no_data_found';
  end if;

  update public.user_profile set status = 'suspended' where id = p_auditor_id;

  return v_profile;
end;
$$;


ALTER FUNCTION "public"."suspend_auditor"("p_auditor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."travel_km_per_minute"("p_mode" "public"."travel_mode") RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case p_mode
    when 'public_transport' then 0.30
    when 'own_vehicle'      then 0.50
    else 0.50
  end;
$$;


ALTER FUNCTION "public"."travel_km_per_minute"("p_mode" "public"."travel_mode") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."void_audit"("p_audit_id" "uuid", "p_reason" "text") RETURNS "public"."audit"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_audit public.audit;
begin
  if not app.is_admin() then
    raise exception 'only PICK admin may void an audit'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'say why the audit is being voided' using errcode = 'check_violation';
  end if;

  update public.audit
     set status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason
   where id = p_audit_id and status in ('in_review', 'in_progress', 'assigned')
  returning * into v_audit;

  if v_audit.id is null then
    raise exception 'this audit cannot be voided' using errcode = 'check_violation';
  end if;

  -- The client did not get an audit, so they should not pay for PICK
  -- rejecting its own output.
  perform public.release_credit_for(p_audit_id, 'Audit voided: ' || p_reason);

  return v_audit;
end;
$$;


ALTER FUNCTION "public"."void_audit"("p_audit_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."write_up_due_hours"() RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$ select 48 $$;


ALTER FUNCTION "public"."write_up_due_hours"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignment_override" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "audit_id" "uuid" NOT NULL,
    "chosen_auditor_id" "uuid" NOT NULL,
    "system_auditor_id" "uuid",
    "overridden_by" "uuid" NOT NULL,
    "reason" "text",
    "risk_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assignment_override" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_capture_mode" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer NOT NULL,
    "allows_tallies" boolean DEFAULT false NOT NULL,
    "allows_notes" boolean DEFAULT false NOT NULL,
    "allows_markers" boolean DEFAULT true NOT NULL,
    "caution" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "capture_mode_key_lower" CHECK (("key" ~ '^[a-z][a-z0-9_]*$'::"text"))
);


ALTER TABLE "public"."audit_capture_mode" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_offer" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "audit_id" "uuid" NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "outcome" "public"."assignment_outcome" DEFAULT 'offered'::"public"."assignment_outcome" NOT NULL,
    "match_reason" "text",
    "warnings" "public"."eligibility_flag"[] DEFAULT '{}'::"public"."eligibility_flag"[] NOT NULL,
    "offered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "decline_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "travel_uplift_minor_units" integer DEFAULT "public"."default_travel_uplift_minor_units"() NOT NULL,
    CONSTRAINT "responded_has_timestamp" CHECK ((("outcome" = ANY (ARRAY['offered'::"public"."assignment_outcome", 'expired'::"public"."assignment_outcome"])) OR ("responded_at" IS NOT NULL))),
    CONSTRAINT "travel_uplift_not_negative" CHECK (("travel_uplift_minor_units" >= 0))
);


ALTER TABLE "public"."audit_offer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_pay_item" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "audit_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "amount_minor_units" integer NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pay_kind_known" CHECK (("kind" = ANY (ARRAY['base'::"text", 'travel'::"text", 'no_show'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."audit_pay_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_stage_template" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "audit_type" "public"."audit_type" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "sequence" integer NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "moment" "public"."audit_moment",
    "duration_hint_minutes" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "capture_mode" "text" NOT NULL,
    CONSTRAINT "stage_duration_positive" CHECK ((("duration_hint_minutes" IS NULL) OR ("duration_hint_minutes" > 0))),
    CONSTRAINT "stage_key_lower" CHECK (("key" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "stage_sequence_positive" CHECK (("sequence" > 0))
);


ALTER TABLE "public"."audit_stage_template" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auditor_capability" (
    "auditor_id" "uuid" NOT NULL,
    "audit_type" "public"."audit_type" NOT NULL
);


ALTER TABLE "public"."auditor_capability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auditor_conflict" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "declared_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."auditor_conflict" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auditor_coverage" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "postcode_area" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "place_id" "uuid",
    "source" "public"."coverage_source" DEFAULT 'derived'::"public"."coverage_source" NOT NULL
);


ALTER TABLE "public"."auditor_coverage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_definition" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "code" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "moment" "public"."audit_moment" NOT NULL,
    "compliance_category" "public"."compliance_category" NOT NULL,
    "prompt" "text" NOT NULL,
    "guidance" "text",
    "weight" integer DEFAULT 1 NOT NULL,
    "is_critical" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_finding" "text",
    "client_rationale" "text",
    CONSTRAINT "weight_positive" CHECK (("weight" > 0))
);


ALTER TABLE "public"."check_definition" OWNER TO "postgres";


COMMENT ON COLUMN "public"."check_definition"."client_finding" IS 'What a charity is told when this check fails, as a statement of fact. Never shown to an auditor.';



COMMENT ON COLUMN "public"."check_definition"."client_rationale" IS 'Why the failure matters, in terms a fundraising director recognises.';



CREATE TABLE IF NOT EXISTS "public"."check_result" (
    "id" "uuid" NOT NULL,
    "audit_id" "uuid" NOT NULL,
    "check_definition_id" "uuid" NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "outcome" "public"."check_outcome" NOT NULL,
    "note" "text",
    "occurred_at" timestamp with time zone NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."check_result" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complaint" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "audit_id" "uuid",
    "subject" "public"."complaint_subject" NOT NULL,
    "status" "public"."complaint_status" DEFAULT 'open'::"public"."complaint_status" NOT NULL,
    "body" "text" NOT NULL,
    "raised_by" "uuid" NOT NULL,
    "raised_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "resolution" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_complaint_names_the_audit" CHECK ((("subject" <> 'about_audit'::"public"."complaint_subject") OR ("audit_id" IS NOT NULL))),
    CONSTRAINT "body_not_empty" CHECK (("length"(TRIM(BOTH FROM "body")) > 0))
);


ALTER TABLE "public"."complaint" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credit_bundle" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "quantity" integer NOT NULL,
    "price_minor_units" integer NOT NULL,
    "currency" character(3) DEFAULT 'GBP'::"bpchar" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credit_bundle_price_positive" CHECK (("price_minor_units" > 0)),
    CONSTRAINT "credit_bundle_quantity_positive" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."credit_bundle" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evidence_attachment" (
    "id" "uuid" NOT NULL,
    "audit_id" "uuid" NOT NULL,
    "observation_log_id" "uuid",
    "kind" "public"."evidence_kind" NOT NULL,
    "storage_bucket" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "byte_size" bigint,
    "duration_seconds" integer,
    "sha256" "text",
    "captured_at" timestamp with time zone,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."evidence_attachment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."observation_log" (
    "id" "uuid" NOT NULL,
    "audit_id" "uuid" NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "kind" "public"."observation_kind" DEFAULT 'note'::"public"."observation_kind" NOT NULL,
    "moment" "public"."audit_moment",
    "body" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "occurred_at" timestamp with time zone NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "severity" "public"."flag_severity",
    "stage_key" "text",
    CONSTRAINT "severity_only_on_incident" CHECK ((("severity" IS NULL) OR ("kind" = 'incident'::"public"."observation_kind")))
);


ALTER TABLE "public"."observation_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organisation" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "name" "text" NOT NULL,
    "org_type" "public"."org_type" NOT NULL,
    "residency_zone" "public"."residency_zone" DEFAULT 'uk'::"public"."residency_zone" NOT NULL,
    "charity_number" "text",
    "companies_house_number" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organisation" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."organisation_credit_balance" WITH ("security_invoker"='true') AS
 SELECT "organisation_id",
    ("sum"("delta"))::integer AS "balance"
   FROM "public"."credit_transaction"
  GROUP BY "organisation_id";


ALTER VIEW "public"."organisation_credit_balance" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."organisation_credit_position" WITH ("security_invoker"='true') AS
 SELECT "organisation_id",
    (COALESCE("sum"("delta") FILTER (WHERE ("reason" = 'purchase'::"public"."credit_reason")), (0)::bigint))::integer AS "purchased",
    (COALESCE("sum"((- "delta")) FILTER (WHERE ("reason" = 'reservation'::"public"."credit_reason")), (0)::bigint))::integer AS "reserved_ever",
    (COALESCE("count"(*) FILTER (WHERE ("reason" = 'consumption'::"public"."credit_reason")), (0)::bigint))::integer AS "consumed",
    (COALESCE("sum"("delta") FILTER (WHERE ("reason" = 'release'::"public"."credit_reason")), (0)::bigint))::integer AS "released",
    (COALESCE("sum"("delta") FILTER (WHERE ("reason" = 'refund'::"public"."credit_reason")), (0)::bigint))::integer AS "refunded",
    (COALESCE("sum"("delta"), (0)::bigint))::integer AS "available"
   FROM "public"."credit_transaction"
  GROUP BY "organisation_id";


ALTER VIEW "public"."organisation_credit_position" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payout_line_item" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "payout_run_id" "uuid" NOT NULL,
    "auditor_id" "uuid" NOT NULL,
    "audit_id" "uuid",
    "amount_minor_units" bigint NOT NULL,
    "description" "text",
    "status" "public"."payout_line_status" DEFAULT 'pending'::"public"."payout_line_status" NOT NULL,
    "external_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payout_line_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."place" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "country_code" character(2) NOT NULL,
    "name" "text" NOT NULL,
    "region" "text",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "place_latitude_sane" CHECK ((("latitude" >= ('-90'::integer)::double precision) AND ("latitude" <= (90)::double precision))),
    CONSTRAINT "place_longitude_sane" CHECK ((("longitude" >= ('-180'::integer)::double precision) AND ("longitude" <= (180)::double precision))),
    CONSTRAINT "place_name_not_empty" CHECK (("length"(TRIM(BOTH FROM "name")) > 0))
);


ALTER TABLE "public"."place" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prep_progress" (
    "auditor_id" "uuid" NOT NULL,
    "check_definition_id" "uuid" NOT NULL,
    "learnt_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."prep_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_gate" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v7"() NOT NULL,
    "trigger" "public"."review_gate_trigger" NOT NULL,
    "mode" "public"."review_gate_mode" DEFAULT 'hold'::"public"."review_gate_mode" NOT NULL,
    "scope" "public"."review_gate_scope" DEFAULT 'client_release'::"public"."review_gate_scope" NOT NULL,
    "approver_id" "uuid",
    "timeout_days" integer DEFAULT 3 NOT NULL,
    "on_timeout" "public"."review_timeout_action" DEFAULT 'auto_approve'::"public"."review_timeout_action" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "threshold" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "gate_timeout_positive" CHECK (("timeout_days" > 0))
);


ALTER TABLE "public"."review_gate" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profile" (
    "id" "uuid" NOT NULL,
    "organisation_id" "uuid",
    "role" "public"."app_role" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "status" "public"."user_status" DEFAULT 'invited'::"public"."user_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invited_by" "uuid",
    CONSTRAINT "client_requires_org" CHECK ((("role" <> 'client'::"public"."app_role") OR ("organisation_id" IS NOT NULL)))
);


ALTER TABLE "public"."user_profile" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profile"."invited_by" IS 'PICK admin who sent the invite. Null for accounts created any other way — including the public sign-up route, when that exists.';



ALTER TABLE ONLY "public"."assignment_override"
    ADD CONSTRAINT "assignment_override_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_capture_mode"
    ADD CONSTRAINT "audit_capture_mode_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."audit_offer"
    ADD CONSTRAINT "audit_offer_audit_id_auditor_id_key" UNIQUE ("audit_id", "auditor_id");



ALTER TABLE ONLY "public"."audit_offer"
    ADD CONSTRAINT "audit_offer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_pay_item"
    ADD CONSTRAINT "audit_pay_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."audit_stage_template"
    ADD CONSTRAINT "audit_stage_template_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auditor_capability"
    ADD CONSTRAINT "auditor_capability_pkey" PRIMARY KEY ("auditor_id", "audit_type");



ALTER TABLE ONLY "public"."auditor_conflict"
    ADD CONSTRAINT "auditor_conflict_auditor_id_organisation_id_key" UNIQUE ("auditor_id", "organisation_id");



ALTER TABLE ONLY "public"."auditor_conflict"
    ADD CONSTRAINT "auditor_conflict_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auditor_coverage"
    ADD CONSTRAINT "auditor_coverage_auditor_id_postcode_area_key" UNIQUE ("auditor_id", "postcode_area");



ALTER TABLE ONLY "public"."auditor_coverage"
    ADD CONSTRAINT "auditor_coverage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auditor_profile"
    ADD CONSTRAINT "auditor_profile_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."check_definition"
    ADD CONSTRAINT "check_definition_code_version_key" UNIQUE ("code", "version");



ALTER TABLE ONLY "public"."check_definition"
    ADD CONSTRAINT "check_definition_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_result"
    ADD CONSTRAINT "check_result_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaint"
    ADD CONSTRAINT "complaint_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_bundle"
    ADD CONSTRAINT "credit_bundle_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_transaction"
    ADD CONSTRAINT "credit_transaction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evidence_attachment"
    ADD CONSTRAINT "evidence_attachment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evidence_attachment"
    ADD CONSTRAINT "evidence_attachment_storage_bucket_storage_path_key" UNIQUE ("storage_bucket", "storage_path");



ALTER TABLE ONLY "public"."observation_log"
    ADD CONSTRAINT "observation_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organisation"
    ADD CONSTRAINT "organisation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_line_item"
    ADD CONSTRAINT "payout_line_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_run"
    ADD CONSTRAINT "payout_run_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout_run"
    ADD CONSTRAINT "payout_run_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."place"
    ADD CONSTRAINT "place_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prep_progress"
    ADD CONSTRAINT "prep_progress_pkey" PRIMARY KEY ("auditor_id", "check_definition_id");



ALTER TABLE ONLY "public"."review_gate"
    ADD CONSTRAINT "review_gate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_gate"
    ADD CONSTRAINT "review_gate_trigger_key" UNIQUE ("trigger");



ALTER TABLE ONLY "public"."risk_advisory"
    ADD CONSTRAINT "risk_advisory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."risk"
    ADD CONSTRAINT "risk_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id");



CREATE INDEX "assignment_override_audit_idx" ON "public"."assignment_override" USING "btree" ("audit_id");



CREATE INDEX "assignment_override_auditor_idx" ON "public"."assignment_override" USING "btree" ("chosen_auditor_id", "created_at");



CREATE INDEX "audit_auditor_idx" ON "public"."audit" USING "btree" ("auditor_id", "status");



CREATE INDEX "audit_client_idx" ON "public"."audit" USING "btree" ("client_organisation_id", "status");



CREATE INDEX "audit_matching_idx" ON "public"."audit" USING "btree" ("postcode_area", "status") WHERE ("status" = 'booked'::"public"."audit_status");



CREATE INDEX "audit_offer_auditor_idx" ON "public"."audit_offer" USING "btree" ("auditor_id", "outcome");



CREATE UNIQUE INDEX "audit_offer_one_accepted" ON "public"."audit_offer" USING "btree" ("audit_id") WHERE ("outcome" = 'accepted'::"public"."assignment_outcome");



CREATE INDEX "audit_offer_open_idx" ON "public"."audit_offer" USING "btree" ("audit_id") WHERE ("outcome" = 'offered'::"public"."assignment_outcome");



CREATE INDEX "audit_pay_item_audit_idx" ON "public"."audit_pay_item" USING "btree" ("audit_id");



CREATE INDEX "audit_place_idx" ON "public"."audit" USING "btree" ("place_id", "status");



CREATE INDEX "audit_scheduled_idx" ON "public"."audit" USING "btree" ("scheduled_for");



CREATE UNIQUE INDEX "audit_stage_template_key_idx" ON "public"."audit_stage_template" USING "btree" ("audit_type", "version", "key");



CREATE UNIQUE INDEX "audit_stage_template_moment_idx" ON "public"."audit_stage_template" USING "btree" ("audit_type", "version", "moment") WHERE ("moment" IS NOT NULL);



CREATE UNIQUE INDEX "audit_stage_template_sequence_idx" ON "public"."audit_stage_template" USING "btree" ("audit_type", "version", "sequence");



CREATE INDEX "auditor_conflict_org_idx" ON "public"."auditor_conflict" USING "btree" ("organisation_id");



CREATE INDEX "auditor_coverage_area_idx" ON "public"."auditor_coverage" USING "btree" ("postcode_area");



CREATE INDEX "auditor_coverage_matching_idx" ON "public"."auditor_coverage" USING "btree" ("place_id") WHERE ("source" <> 'excluded'::"public"."coverage_source");



CREATE UNIQUE INDEX "auditor_coverage_place_idx" ON "public"."auditor_coverage" USING "btree" ("auditor_id", "place_id") WHERE ("place_id" IS NOT NULL);



CREATE INDEX "check_definition_moment_idx" ON "public"."check_definition" USING "btree" ("version", "moment", "sort_order") WHERE "is_active";



CREATE INDEX "check_result_latest_idx" ON "public"."check_result" USING "btree" ("audit_id", "check_definition_id", "occurred_at" DESC);



CREATE INDEX "complaint_open_idx" ON "public"."complaint" USING "btree" ("status") WHERE ("status" = 'open'::"public"."complaint_status");



CREATE INDEX "complaint_org_idx" ON "public"."complaint" USING "btree" ("organisation_id", "status");



CREATE UNIQUE INDEX "credit_bundle_active_quantity_idx" ON "public"."credit_bundle" USING "btree" ("quantity") WHERE "is_active";



CREATE UNIQUE INDEX "credit_transaction_one_consumption_per_audit" ON "public"."credit_transaction" USING "btree" ("audit_id") WHERE ("reason" = 'consumption'::"public"."credit_reason");



CREATE UNIQUE INDEX "credit_transaction_one_reservation_per_audit" ON "public"."credit_transaction" USING "btree" ("audit_id") WHERE ("reason" = 'reservation'::"public"."credit_reason");



CREATE INDEX "credit_transaction_org_idx" ON "public"."credit_transaction" USING "btree" ("organisation_id", "occurred_at");



CREATE INDEX "evidence_attachment_audit_idx" ON "public"."evidence_attachment" USING "btree" ("audit_id");



CREATE INDEX "observation_log_audit_idx" ON "public"."observation_log" USING "btree" ("audit_id", "occurred_at");



CREATE INDEX "observation_log_stage_idx" ON "public"."observation_log" USING "btree" ("audit_id", "stage_key") WHERE ("stage_key" IS NOT NULL);



CREATE INDEX "organisation_org_type_idx" ON "public"."organisation" USING "btree" ("org_type") WHERE "is_active";



CREATE INDEX "payout_line_item_auditor_idx" ON "public"."payout_line_item" USING "btree" ("auditor_id");



CREATE UNIQUE INDEX "payout_line_item_one_per_audit" ON "public"."payout_line_item" USING "btree" ("audit_id") WHERE ("audit_id" IS NOT NULL);



CREATE INDEX "payout_line_item_run_idx" ON "public"."payout_line_item" USING "btree" ("payout_run_id");



CREATE INDEX "place_country_idx" ON "public"."place" USING "btree" ("country_code");



CREATE UNIQUE INDEX "place_identity_idx" ON "public"."place" USING "btree" ("country_code", "name", COALESCE("region", ''::"text"));



CREATE INDEX "risk_advisory_risk_idx" ON "public"."risk_advisory" USING "btree" ("risk_id", "advised_at");



CREATE INDEX "risk_open_idx" ON "public"."risk" USING "btree" ("status") WHERE ("status" = ANY (ARRAY['open'::"public"."risk_status", 'advised'::"public"."risk_status"]));



CREATE INDEX "risk_org_idx" ON "public"."risk" USING "btree" ("organisation_id", "status");



CREATE INDEX "risk_subject_idx" ON "public"."risk" USING "btree" ("subject_type", "subject_id");



CREATE UNIQUE INDEX "user_profile_email_key" ON "public"."user_profile" USING "btree" ("lower"("email"));



CREATE INDEX "user_profile_org_idx" ON "public"."user_profile" USING "btree" ("organisation_id");



CREATE OR REPLACE TRIGGER "audit_capture_mode_touch" BEFORE UPDATE ON "public"."audit_capture_mode" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "audit_offer_touch" BEFORE UPDATE ON "public"."audit_offer" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "audit_stage_template_touch" BEFORE UPDATE ON "public"."audit_stage_template" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "audit_touch" BEFORE UPDATE ON "public"."audit" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "auditor_profile_touch" BEFORE UPDATE ON "public"."auditor_profile" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "check_result_append_only" BEFORE DELETE OR UPDATE ON "public"."check_result" FOR EACH STATEMENT EXECUTE FUNCTION "app"."deny_mutation"();



CREATE OR REPLACE TRIGGER "complaint_touch" BEFORE UPDATE ON "public"."complaint" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "credit_bundle_touch" BEFORE UPDATE ON "public"."credit_bundle" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "credit_transaction_append_only" BEFORE DELETE OR UPDATE ON "public"."credit_transaction" FOR EACH STATEMENT EXECUTE FUNCTION "app"."deny_mutation"();



CREATE OR REPLACE TRIGGER "observation_log_append_only" BEFORE DELETE OR UPDATE ON "public"."observation_log" FOR EACH STATEMENT EXECUTE FUNCTION "app"."deny_mutation"();



CREATE OR REPLACE TRIGGER "organisation_touch" BEFORE UPDATE ON "public"."organisation" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "payout_line_item_touch" BEFORE UPDATE ON "public"."payout_line_item" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "payout_run_touch" BEFORE UPDATE ON "public"."payout_run" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "review_gate_touch" BEFORE UPDATE ON "public"."review_gate" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "risk_touch" BEFORE UPDATE ON "public"."risk" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "user_profile_touch" BEFORE UPDATE ON "public"."user_profile" FOR EACH ROW EXECUTE FUNCTION "app"."touch_updated_at"();



ALTER TABLE ONLY "public"."assignment_override"
    ADD CONSTRAINT "assignment_override_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignment_override"
    ADD CONSTRAINT "assignment_override_chosen_auditor_id_fkey" FOREIGN KEY ("chosen_auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assignment_override"
    ADD CONSTRAINT "assignment_override_overridden_by_fkey" FOREIGN KEY ("overridden_by") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."assignment_override"
    ADD CONSTRAINT "assignment_override_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "public"."risk"("id");



ALTER TABLE ONLY "public"."assignment_override"
    ADD CONSTRAINT "assignment_override_system_auditor_id_fkey" FOREIGN KEY ("system_auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_client_organisation_id_fkey" FOREIGN KEY ("client_organisation_id") REFERENCES "public"."organisation"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."audit_offer"
    ADD CONSTRAINT "audit_offer_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_offer"
    ADD CONSTRAINT "audit_offer_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_pay_item"
    ADD CONSTRAINT "audit_pay_item_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_preferred_auditor_id_fkey" FOREIGN KEY ("preferred_auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit"
    ADD CONSTRAINT "audit_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."audit_stage_template"
    ADD CONSTRAINT "audit_stage_template_capture_mode_fkey" FOREIGN KEY ("capture_mode") REFERENCES "public"."audit_capture_mode"("key");



ALTER TABLE ONLY "public"."auditor_capability"
    ADD CONSTRAINT "auditor_capability_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auditor_conflict"
    ADD CONSTRAINT "auditor_conflict_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auditor_conflict"
    ADD CONSTRAINT "auditor_conflict_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auditor_coverage"
    ADD CONSTRAINT "auditor_coverage_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auditor_coverage"
    ADD CONSTRAINT "auditor_coverage_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."place"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."auditor_profile"
    ADD CONSTRAINT "auditor_profile_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."auditor_profile"
    ADD CONSTRAINT "auditor_profile_base_place_id_fkey" FOREIGN KEY ("base_place_id") REFERENCES "public"."place"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."auditor_profile"
    ADD CONSTRAINT "auditor_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_result"
    ADD CONSTRAINT "check_result_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."check_result"
    ADD CONSTRAINT "check_result_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."check_result"
    ADD CONSTRAINT "check_result_check_definition_id_fkey" FOREIGN KEY ("check_definition_id") REFERENCES "public"."check_definition"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."complaint"
    ADD CONSTRAINT "complaint_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."complaint"
    ADD CONSTRAINT "complaint_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."complaint"
    ADD CONSTRAINT "complaint_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "public"."user_profile"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."credit_transaction"
    ADD CONSTRAINT "credit_transaction_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."credit_transaction"
    ADD CONSTRAINT "credit_transaction_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."credit_transaction"
    ADD CONSTRAINT "credit_transaction_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."credit_transaction"
    ADD CONSTRAINT "credit_transaction_settles_transaction_id_fkey" FOREIGN KEY ("settles_transaction_id") REFERENCES "public"."credit_transaction"("id");



ALTER TABLE ONLY "public"."credit_transaction"
    ADD CONSTRAINT "credit_transaction_source_purchase_id_fkey" FOREIGN KEY ("source_purchase_id") REFERENCES "public"."credit_transaction"("id");



ALTER TABLE ONLY "public"."evidence_attachment"
    ADD CONSTRAINT "evidence_attachment_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evidence_attachment"
    ADD CONSTRAINT "evidence_attachment_observation_log_id_fkey" FOREIGN KEY ("observation_log_id") REFERENCES "public"."observation_log"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."observation_log"
    ADD CONSTRAINT "observation_log_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."observation_log"
    ADD CONSTRAINT "observation_log_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payout_line_item"
    ADD CONSTRAINT "payout_line_item_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "public"."audit"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payout_line_item"
    ADD CONSTRAINT "payout_line_item_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payout_line_item"
    ADD CONSTRAINT "payout_line_item_payout_run_id_fkey" FOREIGN KEY ("payout_run_id") REFERENCES "public"."payout_run"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout_run"
    ADD CONSTRAINT "payout_run_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."payout_run"
    ADD CONSTRAINT "payout_run_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."prep_progress"
    ADD CONSTRAINT "prep_progress_auditor_id_fkey" FOREIGN KEY ("auditor_id") REFERENCES "public"."auditor_profile"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prep_progress"
    ADD CONSTRAINT "prep_progress_check_definition_id_fkey" FOREIGN KEY ("check_definition_id") REFERENCES "public"."check_definition"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_gate"
    ADD CONSTRAINT "review_gate_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."risk_advisory"
    ADD CONSTRAINT "risk_advisory_advised_by_fkey" FOREIGN KEY ("advised_by") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."risk_advisory"
    ADD CONSTRAINT "risk_advisory_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "public"."risk"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."risk"
    ADD CONSTRAINT "risk_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."risk"
    ADD CONSTRAINT "risk_raised_by_id_fkey" FOREIGN KEY ("raised_by_id") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."user_profile"("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisation"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."assignment_override" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assignment_override_admin" ON "public"."assignment_override" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



ALTER TABLE "public"."audit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_admin_delete" ON "public"."audit" FOR DELETE TO "authenticated" USING ("app"."is_admin"());



ALTER TABLE "public"."audit_capture_mode" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_capture_mode_admin_write" ON "public"."audit_capture_mode" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "audit_capture_mode_read" ON "public"."audit_capture_mode" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "audit_client_insert" ON "public"."audit" FOR INSERT TO "authenticated" WITH CHECK (("app"."is_admin"() OR ("client_organisation_id" = "app"."current_org"())));



ALTER TABLE "public"."audit_offer" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_offer_admin_write" ON "public"."audit_offer" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "audit_offer_read" ON "public"."audit_offer" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("auditor_id" = "auth"."uid"())));



CREATE POLICY "audit_offer_respond" ON "public"."audit_offer" FOR UPDATE TO "authenticated" USING ((("auditor_id" = "auth"."uid"()) AND ("outcome" = 'offered'::"public"."assignment_outcome"))) WITH CHECK ((("auditor_id" = "auth"."uid"()) AND ("outcome" = ANY (ARRAY['accepted'::"public"."assignment_outcome", 'declined'::"public"."assignment_outcome"]))));



ALTER TABLE "public"."audit_pay_item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_pay_item_admin_write" ON "public"."audit_pay_item" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "audit_pay_item_read" ON "public"."audit_pay_item" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."audit" "a"
  WHERE (("a"."id" = "audit_pay_item"."audit_id") AND ("a"."auditor_id" = "auth"."uid"()))))));



CREATE POLICY "audit_read" ON "public"."audit" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("auditor_id" = "auth"."uid"()) OR ("client_organisation_id" = "app"."current_org"())));



ALTER TABLE "public"."audit_stage_template" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_stage_template_admin_write" ON "public"."audit_stage_template" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "audit_stage_template_read" ON "public"."audit_stage_template" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "audit_update" ON "public"."audit" FOR UPDATE TO "authenticated" USING (("app"."is_admin"() OR ("auditor_id" = "auth"."uid"()))) WITH CHECK (("app"."is_admin"() OR ("auditor_id" = "auth"."uid"())));



ALTER TABLE "public"."auditor_capability" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auditor_capability_admin" ON "public"."auditor_capability" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "auditor_capability_read" ON "public"."auditor_capability" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("auditor_id" = "auth"."uid"())));



ALTER TABLE "public"."auditor_conflict" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auditor_conflict_admin" ON "public"."auditor_conflict" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "auditor_conflict_read" ON "public"."auditor_conflict" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("auditor_id" = "auth"."uid"())));



ALTER TABLE "public"."auditor_coverage" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auditor_coverage_admin_write" ON "public"."auditor_coverage" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "auditor_coverage_read" ON "public"."auditor_coverage" FOR SELECT TO "authenticated" USING ((("auditor_id" = "auth"."uid"()) OR "app"."is_admin"()));



ALTER TABLE "public"."auditor_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "auditor_profile_admin_write" ON "public"."auditor_profile" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "auditor_profile_read" ON "public"."auditor_profile" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "app"."is_admin"()));



ALTER TABLE "public"."check_definition" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "check_definition_admin_write" ON "public"."check_definition" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "check_definition_read" ON "public"."check_definition" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."check_result" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "check_result_insert" ON "public"."check_result" FOR INSERT TO "authenticated" WITH CHECK ((("auditor_id" = "auth"."uid"()) AND "app"."owns_audit"("audit_id")));



CREATE POLICY "check_result_read" ON "public"."check_result" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("auditor_id" = "auth"."uid"()) OR "app"."audit_in_org"("audit_id")));



ALTER TABLE "public"."complaint" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "complaint_admin_write" ON "public"."complaint" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "complaint_raise" ON "public"."complaint" FOR INSERT TO "authenticated" WITH CHECK ((("organisation_id" = "app"."current_org"()) AND ("raised_by" = "auth"."uid"())));



CREATE POLICY "complaint_read" ON "public"."complaint" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("organisation_id" = "app"."current_org"())));



ALTER TABLE "public"."credit_bundle" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credit_bundle_admin_write" ON "public"."credit_bundle" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "credit_bundle_read" ON "public"."credit_bundle" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."credit_transaction" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credit_transaction_admin_insert" ON "public"."credit_transaction" FOR INSERT TO "authenticated" WITH CHECK ("app"."is_admin"());



CREATE POLICY "credit_transaction_read" ON "public"."credit_transaction" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("organisation_id" = "app"."current_org"())));



ALTER TABLE "public"."evidence_attachment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evidence_attachment_admin_write" ON "public"."evidence_attachment" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "evidence_attachment_insert" ON "public"."evidence_attachment" FOR INSERT TO "authenticated" WITH CHECK ("app"."owns_audit"("audit_id"));



CREATE POLICY "evidence_attachment_read" ON "public"."evidence_attachment" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR "app"."owns_audit"("audit_id") OR "app"."audit_in_org"("audit_id")));



ALTER TABLE "public"."observation_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "observation_log_insert" ON "public"."observation_log" FOR INSERT TO "authenticated" WITH CHECK ((("auditor_id" = "auth"."uid"()) AND "app"."owns_audit"("audit_id")));



CREATE POLICY "observation_log_read" ON "public"."observation_log" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("auditor_id" = "auth"."uid"()) OR "app"."audit_in_org"("audit_id")));



ALTER TABLE "public"."organisation" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organisation_admin_write" ON "public"."organisation" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "organisation_read" ON "public"."organisation" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("id" = "app"."current_org"())));



ALTER TABLE "public"."payout_line_item" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payout_line_item_admin_write" ON "public"."payout_line_item" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "payout_line_item_read" ON "public"."payout_line_item" FOR SELECT TO "authenticated" USING (("app"."is_admin"() OR ("auditor_id" = "auth"."uid"())));



ALTER TABLE "public"."payout_run" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payout_run_admin" ON "public"."payout_run" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



ALTER TABLE "public"."place" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "place_readable" ON "public"."place" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."prep_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prep_progress_admin_read" ON "public"."prep_progress" FOR SELECT TO "authenticated" USING ("app"."is_admin"());



CREATE POLICY "prep_progress_own" ON "public"."prep_progress" TO "authenticated" USING (("auditor_id" = "auth"."uid"())) WITH CHECK (("auditor_id" = "auth"."uid"()));



ALTER TABLE "public"."review_gate" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "review_gate_admin" ON "public"."review_gate" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "review_gate_read" ON "public"."review_gate" FOR SELECT TO "authenticated" USING ("app"."is_admin"());



ALTER TABLE "public"."risk" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "risk_admin" ON "public"."risk" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



ALTER TABLE "public"."risk_advisory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "risk_advisory_admin" ON "public"."risk_advisory" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profile_admin_write" ON "public"."user_profile" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "user_profile_read" ON "public"."user_profile" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "app"."is_admin"() OR (("organisation_id" IS NOT NULL) AND ("organisation_id" = "app"."current_org"()))));



GRANT USAGE ON SCHEMA "app" TO "service_role";
GRANT USAGE ON SCHEMA "app" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "app"."audit_in_org"("target" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "app"."current_org"() TO "authenticated";



GRANT ALL ON FUNCTION "app"."current_role"() TO "authenticated";



GRANT ALL ON FUNCTION "app"."deny_mutation"() TO "authenticated";



GRANT ALL ON FUNCTION "app"."is_admin"() TO "authenticated";



GRANT ALL ON FUNCTION "app"."owns_audit"("target" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "app"."touch_updated_at"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."single_credit_price_minor_units"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."single_credit_price_minor_units"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."single_credit_price_minor_units"() TO "service_role";



GRANT ALL ON FUNCTION "public"."uuid_generate_v7"() TO "anon";
GRANT ALL ON FUNCTION "public"."uuid_generate_v7"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."uuid_generate_v7"() TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_reference_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_reference_seq" TO "service_role";



GRANT ALL ON TABLE "public"."audit" TO "authenticated";
GRANT ALL ON TABLE "public"."audit" TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_offer"("p_offer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_offer"("p_offer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_offer"("p_offer_id" "uuid") TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."credit_transaction" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_transaction" TO "service_role";



REVOKE ALL ON FUNCTION "public"."adjust_credits"("p_organisation_id" "uuid", "p_delta" integer, "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."adjust_credits"("p_organisation_id" "uuid", "p_delta" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_credits"("p_organisation_id" "uuid", "p_delta" integer, "p_reason" "text") TO "service_role";



GRANT ALL ON TABLE "public"."risk_advisory" TO "anon";
GRANT ALL ON TABLE "public"."risk_advisory" TO "authenticated";
GRANT ALL ON TABLE "public"."risk_advisory" TO "service_role";



REVOKE ALL ON FUNCTION "public"."advise_on_risk"("p_risk_id" "uuid", "p_content" "text", "p_channel" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."advise_on_risk"("p_risk_id" "uuid", "p_content" "text", "p_channel" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."advise_on_risk"("p_risk_id" "uuid", "p_content" "text", "p_channel" "text") TO "service_role";



GRANT ALL ON TABLE "public"."auditor_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."auditor_profile" TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_auditor"("p_auditor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_auditor"("p_auditor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_auditor"("p_auditor_id" "uuid") TO "service_role";



GRANT ALL ON SEQUENCE "public"."payout_run_reference_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payout_run_reference_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payout_run" TO "authenticated";
GRANT ALL ON TABLE "public"."payout_run" TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_payout_run"("p_run_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_payout_run"("p_run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_payout_run"("p_run_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assignment_console"("p_audit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assignment_console"("p_audit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assignment_console"("p_audit_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."audit_gate_state"("p_audit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."audit_gate_state"("p_audit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_gate_state"("p_audit_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auditor_code_for"("p_auditor_id" "uuid", "p_organisation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auditor_code_for"("p_auditor_id" "uuid", "p_organisation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auditor_code_for"("p_auditor_id" "uuid", "p_organisation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auditor_roster"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auditor_roster"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auditor_roster"() TO "service_role";



GRANT ALL ON FUNCTION "public"."base_audit_fee_minor_units"() TO "anon";
GRANT ALL ON FUNCTION "public"."base_audit_fee_minor_units"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."base_audit_fee_minor_units"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."book_audit"("p_organisation_id" "uuid", "p_audit_type" "public"."audit_type", "p_shift_payment_method" "public"."shift_payment_method", "p_postcode" "text", "p_place_id" "uuid", "p_window_start_on" "date", "p_window_end_on" "date", "p_site_name" "text", "p_campaign_name" "text", "p_requires_av" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."book_audit"("p_organisation_id" "uuid", "p_audit_type" "public"."audit_type", "p_shift_payment_method" "public"."shift_payment_method", "p_postcode" "text", "p_place_id" "uuid", "p_window_start_on" "date", "p_window_end_on" "date", "p_site_name" "text", "p_campaign_name" "text", "p_requires_av" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."book_audit"("p_organisation_id" "uuid", "p_audit_type" "public"."audit_type", "p_shift_payment_method" "public"."shift_payment_method", "p_postcode" "text", "p_place_id" "uuid", "p_window_start_on" "date", "p_window_end_on" "date", "p_site_name" "text", "p_campaign_name" "text", "p_requires_av" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."booking_lead_days"() TO "anon";
GRANT ALL ON FUNCTION "public"."booking_lead_days"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."booking_lead_days"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."build_payout_run"("p_period_start" "date", "p_period_end" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."build_payout_run"("p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."build_payout_run"("p_period_start" "date", "p_period_end" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."client_roster"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."client_roster"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."client_roster"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_auditor_profile"("p_full_name" "text", "p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_audit_types" "public"."audit_type"[], "p_av_capable" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_auditor_profile"("p_full_name" "text", "p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_audit_types" "public"."audit_type"[], "p_av_capable" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_auditor_profile"("p_full_name" "text", "p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_audit_types" "public"."audit_type"[], "p_av_capable" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_credit_for"("p_audit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_credit_for"("p_audit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_credit_for"("p_audit_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."decline_offer"("p_offer_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decline_offer"("p_offer_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decline_offer"("p_offer_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."default_travel_uplift_minor_units"() TO "anon";
GRANT ALL ON FUNCTION "public"."default_travel_uplift_minor_units"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."default_travel_uplift_minor_units"() TO "service_role";



GRANT ALL ON FUNCTION "public"."distance_km"("p_lat_a" double precision, "p_lng_a" double precision, "p_lat_b" double precision, "p_lng_b" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."distance_km"("p_lat_a" double precision, "p_lng_a" double precision, "p_lat_b" double precision, "p_lng_b" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."distance_km"("p_lat_a" double precision, "p_lng_a" double precision, "p_lat_b" double precision, "p_lng_b" double precision) TO "service_role";



REVOKE ALL ON FUNCTION "public"."eligible_auditors"("p_audit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."eligible_auditors"("p_audit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."eligible_auditors"("p_audit_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."execute_payout_run"("p_run_id" "uuid", "p_external_reference" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."execute_payout_run"("p_run_id" "uuid", "p_external_reference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_payout_run"("p_run_id" "uuid", "p_external_reference" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."exposure_window_days"() TO "anon";
GRANT ALL ON FUNCTION "public"."exposure_window_days"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."exposure_window_days"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_report_read"("p_audit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_report_read"("p_audit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_report_read"("p_audit_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."matching_review_gates"("p_audit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."matching_review_gates"("p_audit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."matching_review_gates"("p_audit_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."next_purchase_to_draw_from"("p_organisation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."next_purchase_to_draw_from"("p_organisation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_purchase_to_draw_from"("p_organisation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."offer_audit"("p_audit_id" "uuid", "p_expires_in" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."offer_audit"("p_audit_id" "uuid", "p_expires_in" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."offer_audit"("p_audit_id" "uuid", "p_expires_in" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."offer_board"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."offer_board"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."offer_board"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ops_counters"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ops_counters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ops_counters"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ops_queue"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ops_queue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ops_queue"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."payable_audits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."payable_audits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."payable_audits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."places_within_reach"("p_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."places_within_reach"("p_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode") TO "authenticated";
GRANT ALL ON FUNCTION "public"."places_within_reach"("p_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode") TO "service_role";



REVOKE ALL ON FUNCTION "public"."prefer_auditor"("p_audit_id" "uuid", "p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prefer_auditor"("p_audit_id" "uuid", "p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."prefer_auditor"("p_audit_id" "uuid", "p_code" "text") TO "service_role";



GRANT ALL ON TABLE "public"."risk" TO "anon";
GRANT ALL ON TABLE "public"."risk" TO "authenticated";
GRANT ALL ON TABLE "public"."risk" TO "service_role";



REVOKE ALL ON FUNCTION "public"."raise_risk"("p_type" "public"."risk_type", "p_subject_type" "public"."risk_subject", "p_subject_id" "uuid", "p_detail" "text", "p_severity" "public"."risk_severity", "p_organisation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."raise_risk"("p_type" "public"."risk_type", "p_subject_type" "public"."risk_subject", "p_subject_id" "uuid", "p_detail" "text", "p_severity" "public"."risk_severity", "p_organisation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."raise_risk"("p_type" "public"."risk_type", "p_subject_type" "public"."risk_subject", "p_subject_id" "uuid", "p_detail" "text", "p_severity" "public"."risk_severity", "p_organisation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_audit"("p_audit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_audit"("p_audit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_audit"("p_audit_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_credit_for"("p_audit_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_credit_for"("p_audit_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_credit_for"("p_audit_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."report_no_team_present"("p_audit_id" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."report_no_team_present"("p_audit_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."report_no_team_present"("p_audit_id" "uuid", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."return_write_up"("p_audit_id" "uuid", "p_moments" "public"."audit_moment"[], "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."return_write_up"("p_audit_id" "uuid", "p_moments" "public"."audit_moment"[], "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."return_write_up"("p_audit_id" "uuid", "p_moments" "public"."audit_moment"[], "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."review_gate_audits"() TO "anon";
GRANT ALL ON FUNCTION "public"."review_gate_audits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."review_gate_audits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."review_gate_reason"("p_audit_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."review_gate_reason"("p_audit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."review_gate_reason"("p_audit_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."selectable_auditors"("p_organisation_id" "uuid", "p_place_id" "uuid", "p_audit_type" "public"."audit_type", "p_requires_av" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."selectable_auditors"("p_organisation_id" "uuid", "p_place_id" "uuid", "p_audit_type" "public"."audit_type", "p_requires_av" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."selectable_auditors"("p_organisation_id" "uuid", "p_place_id" "uuid", "p_audit_type" "public"."audit_type", "p_requires_av" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_auditor_coverage"("p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_excluded_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_auditor_coverage"("p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_excluded_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_auditor_coverage"("p_base_place_id" "uuid", "p_minutes" integer, "p_mode" "public"."travel_mode", "p_place_ids" "uuid"[], "p_excluded_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_write_up"("p_audit_id" "uuid", "p_results" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_write_up"("p_audit_id" "uuid", "p_results" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_write_up"("p_audit_id" "uuid", "p_results" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."suspend_auditor"("p_auditor_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."suspend_auditor"("p_auditor_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."suspend_auditor"("p_auditor_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."travel_km_per_minute"("p_mode" "public"."travel_mode") TO "anon";
GRANT ALL ON FUNCTION "public"."travel_km_per_minute"("p_mode" "public"."travel_mode") TO "authenticated";
GRANT ALL ON FUNCTION "public"."travel_km_per_minute"("p_mode" "public"."travel_mode") TO "service_role";



REVOKE ALL ON FUNCTION "public"."void_audit"("p_audit_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."void_audit"("p_audit_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."void_audit"("p_audit_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."write_up_due_hours"() TO "anon";
GRANT ALL ON FUNCTION "public"."write_up_due_hours"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."write_up_due_hours"() TO "service_role";



GRANT ALL ON TABLE "public"."assignment_override" TO "anon";
GRANT ALL ON TABLE "public"."assignment_override" TO "authenticated";
GRANT ALL ON TABLE "public"."assignment_override" TO "service_role";



GRANT ALL ON TABLE "public"."audit_capture_mode" TO "anon";
GRANT ALL ON TABLE "public"."audit_capture_mode" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_capture_mode" TO "service_role";



GRANT ALL ON TABLE "public"."audit_offer" TO "anon";
GRANT ALL ON TABLE "public"."audit_offer" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_offer" TO "service_role";



GRANT ALL ON TABLE "public"."audit_pay_item" TO "anon";
GRANT ALL ON TABLE "public"."audit_pay_item" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_pay_item" TO "service_role";



GRANT ALL ON TABLE "public"."audit_stage_template" TO "anon";
GRANT ALL ON TABLE "public"."audit_stage_template" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_stage_template" TO "service_role";



GRANT ALL ON TABLE "public"."auditor_capability" TO "anon";
GRANT ALL ON TABLE "public"."auditor_capability" TO "authenticated";
GRANT ALL ON TABLE "public"."auditor_capability" TO "service_role";



GRANT ALL ON TABLE "public"."auditor_conflict" TO "anon";
GRANT ALL ON TABLE "public"."auditor_conflict" TO "authenticated";
GRANT ALL ON TABLE "public"."auditor_conflict" TO "service_role";



GRANT ALL ON TABLE "public"."auditor_coverage" TO "authenticated";
GRANT ALL ON TABLE "public"."auditor_coverage" TO "service_role";



GRANT ALL ON TABLE "public"."check_definition" TO "authenticated";
GRANT ALL ON TABLE "public"."check_definition" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."check_result" TO "authenticated";
GRANT ALL ON TABLE "public"."check_result" TO "service_role";



GRANT ALL ON TABLE "public"."complaint" TO "anon";
GRANT ALL ON TABLE "public"."complaint" TO "authenticated";
GRANT ALL ON TABLE "public"."complaint" TO "service_role";



GRANT ALL ON TABLE "public"."credit_bundle" TO "anon";
GRANT ALL ON TABLE "public"."credit_bundle" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_bundle" TO "service_role";



GRANT ALL ON TABLE "public"."evidence_attachment" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence_attachment" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."observation_log" TO "authenticated";
GRANT ALL ON TABLE "public"."observation_log" TO "service_role";



GRANT ALL ON TABLE "public"."organisation" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation" TO "service_role";



GRANT ALL ON TABLE "public"."organisation_credit_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation_credit_balance" TO "service_role";



GRANT ALL ON TABLE "public"."organisation_credit_position" TO "anon";
GRANT ALL ON TABLE "public"."organisation_credit_position" TO "authenticated";
GRANT ALL ON TABLE "public"."organisation_credit_position" TO "service_role";



GRANT ALL ON TABLE "public"."payout_line_item" TO "authenticated";
GRANT ALL ON TABLE "public"."payout_line_item" TO "service_role";



GRANT ALL ON TABLE "public"."place" TO "anon";
GRANT ALL ON TABLE "public"."place" TO "authenticated";
GRANT ALL ON TABLE "public"."place" TO "service_role";



GRANT ALL ON TABLE "public"."prep_progress" TO "anon";
GRANT ALL ON TABLE "public"."prep_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."prep_progress" TO "service_role";



GRANT ALL ON TABLE "public"."review_gate" TO "anon";
GRANT ALL ON TABLE "public"."review_gate" TO "authenticated";
GRANT ALL ON TABLE "public"."review_gate" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "app" GRANT ALL ON FUNCTIONS TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







