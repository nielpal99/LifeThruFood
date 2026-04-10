import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { guestId } = await req.json();
    if (!guestId) {
      return new Response(JSON.stringify({ error: "guestId is required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch guest first to get event name, party size, and payment status
    const { data: guest, error: fetchError } = await supabase
      .from("guests")
      .select("event_name, party_size, payment_status")
      .eq("id", guestId)
      .single();

    if (fetchError || !guest) {
      return new Response(JSON.stringify({ error: "Guest not found" }), { status: 404, headers: corsHeaders });
    }

    // Delete the guest
    const { error: deleteError } = await supabase
      .from("guests")
      .delete()
      .eq("id", guestId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500, headers: corsHeaders });
    }

    // Only decrement counter if they were a paid guest (unpaid guests were never counted)
    if (guest.payment_status === "paid") {
      await supabase.rpc("increment_event_guests", {
        event_name_param: guest.event_name,
        increment_by: -guest.party_size,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: corsHeaders });
  }
});
