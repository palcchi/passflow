#!/usr/bin/env bash
set -euo pipefail

phase1_tmp_dir=$(mktemp -d)
trap 'rm -rf "$phase1_tmp_dir"' EXIT

count_exact() {
  local expected=$1
  shift
  awk -v expected="$expected" '$0 == expected { count++ } END { print count+0 }' "$@"
}

run_registration() {
  local phase1_user_id=$1
  local phase1_output=$2
  psql -XqAt -v ON_ERROR_STOP=1 <<SQL > "$phase1_output"
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','$phase1_user_id',true);
select coalesce(result->>'reason',result->>'ok') from
  (select public.register_for_event('registration-race','Race Visitor',null,'seat') as result) r;
select pg_sleep(1);
commit;
SQL
}

run_claim() {
  local phase1_user_id=$1
  local phase1_output=$2
  psql -XqAt -v ON_ERROR_STOP=1 <<SQL > "$phase1_output"
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','$phase1_user_id',true);
select (public.claim_qr('concurrency-event','RACE-QR')->>'ok')::boolean;
select pg_sleep(1);
commit;
SQL
}

run_scan() {
  local phase1_output=$1
  psql -XqAt -v ON_ERROR_STOP=1 <<SQL > "$phase1_output"
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select public.validate_scan('40000000-0000-4000-8000-000000000031','RACE-QR')->>'decision';
select pg_sleep(1);
commit;
SQL
}

run_registration '40000000-0000-4000-8000-000000000002' "$phase1_tmp_dir/register-a" &
phase1_first=$!
run_registration '40000000-0000-4000-8000-000000000003' "$phase1_tmp_dir/register-b" &
phase1_second=$!
wait "$phase1_first"
wait "$phase1_second"
test "$(count_exact 'true' "$phase1_tmp_dir"/register-*)" -eq 1
test "$(count_exact 'event_full' "$phase1_tmp_dir"/register-*)" -eq 1
psql -XqAt -v ON_ERROR_STOP=1 -c "do \$\$ begin if (select count(*) from public.attendees where event_id='40000000-0000-4000-8000-000000000013') <> 1 then raise exception 'capacity overbooked'; end if; end \$\$;"

run_claim '40000000-0000-4000-8000-000000000002' "$phase1_tmp_dir/claim-a" &
phase1_first=$!
run_claim '40000000-0000-4000-8000-000000000003' "$phase1_tmp_dir/claim-b" &
phase1_second=$!
wait "$phase1_first"
wait "$phase1_second"
test "$(count_exact 't' "$phase1_tmp_dir"/claim-*)" -eq 1
test "$(count_exact 'f' "$phase1_tmp_dir"/claim-*)" -eq 1
psql -XqAt -v ON_ERROR_STOP=1 -c "do \$\$ begin if (select count(*) from public.qr_credentials where code='RACE-QR' and status='active' and attendee_id is not null) <> 1 then raise exception 'duplicate claim'; end if; end \$\$;"

run_scan "$phase1_tmp_dir/scan-a" &
phase1_first=$!
run_scan "$phase1_tmp_dir/scan-b" &
phase1_second=$!
wait "$phase1_first"
wait "$phase1_second"
test "$(count_exact 'granted' "$phase1_tmp_dir"/scan-*)" -eq 1
test "$(count_exact 'already_checked_in' "$phase1_tmp_dir"/scan-*)" -eq 1

psql -XqAt -v ON_ERROR_STOP=1 <<SQL > "$phase1_tmp_dir/revoke" &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
update public.qr_credentials set status='revoked',revoked_at=now() where code='RACE-QR';
\! touch $phase1_tmp_dir/revocation-locked
select pg_sleep(1);
commit;
SQL
phase1_revoke=$!
for phase1_try in {1..100}; do
  test -f "$phase1_tmp_dir/revocation-locked" && break
  sleep .05
done
test -f "$phase1_tmp_dir/revocation-locked"
run_scan "$phase1_tmp_dir/scan-after-revoke"
wait "$phase1_revoke"
grep -qx 'invalid' "$phase1_tmp_dir/scan-after-revoke"
echo 'PASS: concurrent registration, QR claim, check-in and revocation against PostgreSQL'
