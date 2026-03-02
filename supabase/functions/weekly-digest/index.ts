import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find warm contacts that haven't been contacted in 7+ days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: warmContacts, error } = await supabase
      .from("connections")
      .select("user_id, connection_name, last_contacted_at, priority")
      .eq("priority", "warm")
      .eq("archived", false);

    if (error) throw error;

    // Group by user
    const userContacts: Record<string, string[]> = {};
    (warmContacts || []).forEach((c: any) => {
      if (!c.last_contacted_at || new Date(c.last_contacted_at) < sevenDaysAgo) {
        if (!userContacts[c.user_id]) userContacts[c.user_id] = [];
        userContacts[c.user_id].push(c.connection_name);
      }
    });

    // Create notifications for each user
    let notificationCount = 0;
    for (const [userId, names] of Object.entries(userContacts)) {
      if (names.length === 0) continue;

      const nameList = names.slice(0, 3).join(", ");
      const extra = names.length > 3 ? ` and ${names.length - 3} more` : "";

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Warm contacts need attention",
        message: `You have ${names.length} warm contacts you haven't messaged: ${nameList}${extra}`,
        type: "follow_up_scheduled",
      });
      notificationCount++;
    }

    // Auto-archive cold contacts older than 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    await supabase
      .from("connections")
      .update({ archived: true })
      .eq("priority", "cold")
      .eq("archived", false)
      .lt("created_at", sixMonthsAgo.toISOString());

    return new Response(
      JSON.stringify({ success: true, notifications: notificationCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Weekly digest error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
