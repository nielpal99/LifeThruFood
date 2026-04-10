alter table events
  add column if not exists location text,
  add column if not exists event_date timestamptz,
  add column if not exists max_capacity integer not null default 0;

-- Backfill max_capacity from total_capacity for existing rows
update events set max_capacity = total_capacity;
