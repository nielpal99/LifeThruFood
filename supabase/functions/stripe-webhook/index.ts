import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

async function sendEmail(to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Life Thru Food <info@lifethrufood.com>",
      to: [to],
      subject,
      html,
    }),
  });
}

function confirmationEmail(name: string, eventName: string, eventDate: string | null, location: string | null, partySize: number) {
  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "Date TBD";
  const timeStr = eventDate
    ? new Date(eventDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  const firstName = name.split(" ")[0];

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F0E8;font-family:'Georgia',serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="padding:0 0 32px">
    <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#47553F;margin:0">Life Thru Food &nbsp;·&nbsp; New York City</p>
  </td></tr>
  <tr><td style="border-top:1px solid rgba(30,26,20,0.12);padding:32px 0 0">
    <h1 style="font-family:'Georgia',serif;font-weight:400;font-size:28px;color:#1E1C16;margin:0 0 8px;line-height:1.2">You're confirmed, ${firstName}.</h1>
    <p style="font-family:'Georgia',serif;font-size:16px;font-style:italic;color:rgba(30,26,20,0.6);margin:0 0 32px">We're looking forward to having you at the table.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(30,26,20,0.12);margin-bottom:32px">
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(30,26,20,0.08)">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(30,26,20,0.4);margin:0 0 4px">Event</p>
        <p style="font-family:'Georgia',serif;font-size:15px;color:#1E1C16;margin:0">${eventName}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(30,26,20,0.08)">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(30,26,20,0.4);margin:0 0 4px">Date</p>
        <p style="font-family:'Georgia',serif;font-size:15px;color:#1E1C16;margin:0">${dateStr}${timeStr ? ` &middot; Doors at ${timeStr}` : ""}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(30,26,20,0.08)">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(30,26,20,0.4);margin:0 0 4px">Location</p>
        <p style="font-family:'Georgia',serif;font-size:15px;color:#1E1C16;margin:0">${location || "Address shared one week prior"}</p>
      </td></tr>
      <tr><td style="padding:16px 20px">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(30,26,20,0.4);margin:0 0 4px">Party size</p>
        <p style="font-family:'Georgia',serif;font-size:15px;color:#1E1C16;margin:0">${partySize} guest${partySize > 1 ? "s" : ""}</p>
      </td></tr>
    </table>
    <p style="font-family:'Georgia',serif;font-size:15px;font-style:italic;color:rgba(30,26,20,0.6);line-height:1.7;margin:0 0 32px">The full address will be shared one week before the dinner. In the meantime, if you have any questions reach out at <a href="mailto:info@lifethrufood.com" style="color:#47553F">info@lifethrufood.com</a>.</p>
    <p style="font-family:'Georgia',serif;font-size:15px;color:#1E1C16;margin:0 0 4px">See you soon,</p>
    <p style="font-family:'Georgia',serif;font-size:15px;font-style:italic;color:rgba(30,26,20,0.6);margin:0">Life Thru Food</p>
  </td></tr>
  <tr><td style="padding:40px 0 0;border-top:1px solid rgba(30,26,20,0.08);margin-top:40px">
    <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(30,26,20,0.3);margin:0">lifethrufood.com &nbsp;·&nbsp; New York City</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature header", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { eventId, fullName, email, partySize } = session.metadata ?? {};

    if (!eventId || !partySize) {
      console.error("Missing metadata on session:", session.id);
      return new Response("Missing session metadata", { status: 400 });
    }

    // Look up event details
    const { data: ev } = await supabase
      .from("events")
      .select("name, event_date, location")
      .eq("id", eventId)
      .single();

    // Mark guest as paid
    await supabase
      .from("guests")
      .update({ payment_status: "paid" })
      .eq("stripe_session_id", session.id);

    // Increment seat counter
    if (ev?.name) {
      await supabase.rpc("increment_event_guests", {
        event_name_param: ev.name,
        increment_by: parseInt(partySize),
      });
    }

    // Send confirmation email + add to Resend contacts
    const toEmail = email || session.customer_details?.email;
    if (toEmail) {
      const firstName = (fullName || "").split(" ")[0] || "";
      const lastName = (fullName || "").split(" ").slice(1).join(" ") || "";

      // Add to Resend audience
      try {
        await fetch(`https://api.resend.com/audiences/${Deno.env.get("RESEND_AUDIENCE_ID")}/contacts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: toEmail,
            first_name: firstName,
            last_name: lastName,
            unsubscribed: false,
          }),
        });
      } catch (e) {
        console.error("Failed to add Resend contact:", e);
      }

      // Send confirmation email
      if (ev) {
        try {
          await sendEmail(
            toEmail,
            `You're confirmed — ${ev.name}`,
            confirmationEmail(fullName || "there", ev.name, ev.event_date, ev.location, parseInt(partySize))
          );
        } catch (e) {
          console.error("Failed to send confirmation email:", e);
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
