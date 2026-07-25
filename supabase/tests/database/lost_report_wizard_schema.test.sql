begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select has_column(
  'public',
  'lost_reports',
  'photo_url',
  'lost_reports.photo_url exists'
);

select has_column(
  'public',
  'lost_reports',
  'source_session_id',
  'lost_reports.source_session_id exists'
);

select has_column(
  'public',
  'lost_report_drafts',
  'profile_id',
  'lost_report_drafts.profile_id exists'
);

select has_index(
  'public',
  'lost_reports',
  'idx_lost_reports_source_session_id',
  'lost report publish idempotency index exists'
);

select has_index(
  'public',
  'lost_report_drafts',
  'idx_lost_report_drafts_profile_id',
  'lost report draft owner index exists'
);

select results_eq(
  $$
    select public
    from storage.buckets
    where id = 'lost-report-photos'
  $$,
  array[true],
  'lost report photo bucket is public'
);

select results_eq(
  $$
    select file_size_limit
    from storage.buckets
    where id = 'lost-report-photos'
  $$,
  array[2097152::bigint],
  'lost report photo bucket is limited to 2 MB'
);

select results_eq(
  $$
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Lost report photos are publicly readable',
        'Users upload own lost report photos',
        'Users update own lost report photos',
        'Users delete own lost report photos'
      )
  $$,
  array[4::bigint],
  'lost report photo policies exist'
);

select * from finish();

rollback;
