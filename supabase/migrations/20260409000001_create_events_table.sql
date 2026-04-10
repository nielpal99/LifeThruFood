create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  total_capacity integer not null default 0,
  seats_booked integer not null default 0,
  total_guests integer not null default 0,
  created_at timestamptz not null default now()
);

-- Seed the April event so the counter has a row to increment
insert into events (name, total_capacity) values ('April RSVPs', 50);
