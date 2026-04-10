import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function reminderEmail(name: string, eventName: string, eventDate: string, location: string | null, type: "week" | "day") {
  const d = new Date(eventDate);
  const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const firstName = name.split(" ")[0];
  const heading = type === "week" ? `One week away, ${firstName}.` : `Tonight's the night, ${firstName}.`;
  const subheading = type === "week"
    ? "Your seat is reserved. Here's everything you need to know."
    : "We can't wait to see you at the table.";

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
    <h1 style="font-family:'Georgia',serif;font-weight:400;font-size:28px;color:#1E1C16;margin:0 0 8px;line-height:1.2">${heading}</h1>
    <p style="font-family:'Georgia',serif;font-size:16px;font-style:italic;color:rgba(30,26,20,0.6);margin:0 0 32px">${subheading}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(30,26,20,0.12);margin-bottom:32px">
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(30,26,20,0.08)">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(30,26,20,0.4);margin:0 0 4px">Event</p>
        <p style="font-family:'Georgia',serif;font-size:15px;color:#1E1C16;margin:0">${eventName}</p>
      </td></tr>
      <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(30,26,20,0.08)">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(30,26,20,0.4);margin:0 0 4px">Date &amp; Time</p>
        <p style="font-family:'Georgia',serif;font-size:15px;color:#1E1C16;margin:0">${dateStr} &middot; Doors at ${timeStr}</p>
      </td></tr>
      <tr><td style="padding:16px 20px">
        <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(30,26,20,0.4);margin:0 0 4px">Location</p>
        <p style="font-family:'Georgia',serif;font-size:15px;color:#1E1C16;margin:0">${location || "See your confirmation email"}</p>
      </td></tr>
    </table>
    <p style="font-family:'Georgia',serif;font-size:15px;font-style:italic;color:rgba(30,26,20,0.6);line-height:1.7;margin:0 0 32px">Questions? Reach us at <a href="mailto:info@lifethrufood.com" style="color:#47553F">info@lifethrufood.com</a>.</p>
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
  // Simple auth check — must pass service role key as Bearer token
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();

  // Find events happening in exactly 7 days (±12 hours window)
  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);
  const weekStart = new Date(weekOut); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekOut); weekEnd.setHours(23, 59, 59, 999);

  // Find events happening today
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

  const { data: events } = await supabase
    .from("events")
    .select("id, name, event_date, location")
    .or(
      `event_date.gte.${weekStart.toISOString()},event_date.lte.${weekEnd.toISOString()},event_date.gte.${dayStart.toISOString()},event_date.lte.${dayEnd.toISOString()}`
    );

  if (!events?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  let sent = 0;

  for (const ev of events) {
    const evDate = new Date(ev.event_date);
    const isWeekReminder = evDate >= weekStart && evDate <= weekEnd;
    const isDayReminder = evDate >= dayStart && evDate <= dayEnd;
    const type: "week" | "day" = isDayReminder ? "day" : "week";

    if (!isWeekReminder && !isDayReminder) continue;

    const { data: guests } = await supabase
      .from("guests")
      .select("full_name, email")
      .eq("event_name", ev.name)
      .eq("payment_status", "paid");

    if (!guests?.length) continue;

    for (const guest of guests) {
      try {
        await sendEmail(
          guest.email,
          type === "week" ? `One week away — ${ev.name}` : `Tonight — ${ev.name}`,
          reminderEmail(guest.full_name, ev.name, ev.event_date, ev.location, type)
        );
        sent++;
      } catch (e) {
        console.error(`Failed to send to ${guest.email}:`, e);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
});
