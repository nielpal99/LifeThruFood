create table guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  event_name text not null,
  party_size integer not null default 1,
  dietary_restrictions text,
  stripe_session_id text,
  payment_status text not null default 'unpaid',
  created_at timestamptz not null default now()
);
