create or replace function increment_event_guests(event_name_param text, increment_by integer)
returns void
language sql
as $$
  update events
  set
    total_guests = total_guests + increment_by,
    seats_booked = seats_booked + increment_by
  where name = event_name_param;
$$;
