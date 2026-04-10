import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { id, name, location, event_date, max_capacity, price_cents, wine_addon_cents, is_active } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // No id = create new event
    if (!id) {
      if (!name) {
        return new Response(JSON.stringify({ error: "Event name is required" }), { status: 400, headers: corsHeaders });
      }
      const insert: Record<string, unknown> = { name };
      if (location !== undefined) insert.location = location;
      if (event_date !== undefined) insert.event_date = event_date;
      if (max_capacity !== undefined) { insert.max_capacity = max_capacity; insert.total_capacity = max_capacity; }
      if (price_cents !== undefined) insert.price_cents = price_cents;
      if (wine_addon_cents !== undefined) insert.wine_addon_cents = wine_addon_cents;
      if (is_active !== undefined) insert.is_active = is_active;

      const { data, error } = await supabase.from("events").insert(insert).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      return new Response(JSON.stringify({ event: data }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // id provided = update existing event
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (event_date !== undefined) updates.event_date = event_date;
    if (max_capacity !== undefined) { updates.max_capacity = max_capacity; updates.total_capacity = max_capacity; }
    if (price_cents !== undefined) updates.price_cents = price_cents;
    if (wine_addon_cents !== undefined) updates.wine_addon_cents = wine_addon_cents;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase.from("events").update(updates).eq("id", id).select().single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    return new Response(JSON.stringify({ event: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: corsHeaders });
  }
});
