import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { eventId, fullName, email, phone, partySize, dietary, wineAddon } = await req.json();

    if (!eventId || !fullName || !email || !partySize) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: event, error } = await supabase
      .from("events")
      .select("name, total_capacity, seats_booked, price_cents, wine_addon_cents")
      .eq("id", eventId)
      .single();

    if (error || !event) {
      return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: corsHeaders });
    }

    if (event.seats_booked + partySize > event.total_capacity) {
      return new Response(JSON.stringify({ error: "Sold out!" }), { status: 400, headers: corsHeaders });
    }

    const ticketPrice = event.price_cents ?? 6000;
    const winePrice = event.wine_addon_cents ?? 2500;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Life Thru Food: ${event.name}`,
            description: `Dinner for ${partySize} guest${partySize > 1 ? "s" : ""}`,
          },
          unit_amount: ticketPrice,
        },
        quantity: partySize,
      },
    ];

    if (wineAddon) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Wine pairings — curated for each course" },
          unit_amount: winePrice,
        },
        quantity: partySize,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin") || "https://lifethrufood.com"}/success`,
      cancel_url: `${req.headers.get("origin") || "https://lifethrufood.com"}`,
      metadata: {
        eventId,
        fullName,
        email,
        phone: phone || "",
        partySize: partySize.toString(),
        dietary: dietary || "None",
      },
    });

    await supabase.from("guests").insert({
      full_name: fullName,
      email,
      phone,
      event_name: event.name,
      party_size: partySize,
      dietary_restrictions: dietary,
      stripe_session_id: session.id,
      payment_status: "unpaid",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
