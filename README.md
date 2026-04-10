# Life Thru Food

A monthly NYC dinner party series inspired by local creatives. This repo contains the full frontend and Supabase backend.

## Stack

- **Frontend** — single-page HTML/CSS/JS, deployed on Vercel
- **Database** — Supabase (PostgreSQL)
- **Edge Functions** — Supabase (Deno runtime)
- **Payments** — Stripe Checkout
- **Email** — Resend

## Project Structure

```
/
├── index.html                  # Full frontend (RSVP, archive, admin, notify)
├── success.html                # Post-payment confirmation page
└── supabase/
    ├── migrations/             # Database schema
    │   ├── 00000_create_guests_table.sql
    │   ├── 00001_create_events_table.sql
    │   ├── 00002_increment_event_guests_fn.sql
    │   ├── 00003_add_event_details.sql
    │   ├── 00004_create_notify_list.sql
    │   └── 00005_add_event_pricing.sql
    └── functions/
        ├── stripe-checkout/    # Creates Stripe Checkout session, checks capacity
        ├── stripe-webhook/     # Handles payment confirmation, sends emails
        ├── update-event/       # Admin: create/edit events
        ├── remove-guest/       # Admin: remove guest + adjust seat count
        └── send-reminders/     # Scheduled: 1-week + morning-of reminder emails
```

## Features

- **RSVP flow** — password-gated form → Stripe Checkout → webhook marks guest paid
- **Multi-event** — up to 2 active events, each with individual capacity, price, location, date
- **Admin panel** — manage events, view/remove guests, export CSV
- **Email** — confirmation on payment, 1-week reminder, morning-of reminder (via Resend)
- **Notify list** — email capture for future events

## Environment Variables (Supabase Secrets)

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
RESEND_AUDIENCE_ID
```

## Deployment

**Frontend:** Push to GitHub — Vercel auto-deploys on every push.

**Edge Functions:**
```bash
supabase functions deploy stripe-checkout --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy update-event
supabase functions deploy remove-guest
supabase functions deploy send-reminders
```

**Secrets:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_AUDIENCE_ID=...
```
