alter table events
  add column if not exists price_cents integer not null default 6000,
  add column if not exists wine_addon_cents integer not null default 2500,
  add column if not exists is_active boolean not null default true;

-- Backfill existing events
update events set price_cents = 6000, wine_addon_cents = 2500;
