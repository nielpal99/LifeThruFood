create table notify_list (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  source text,
  created_at timestamptz not null default now()
);
