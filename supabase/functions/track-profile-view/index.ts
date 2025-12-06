import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrackViewRequest {
  profileId: string;
  referrer?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[track-profile-view] Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { profileId, referrer }: TrackViewRequest = await req.json();

    if (!profileId) {
      throw new Error("Profile ID is required");
    }

    // Get device info from user agent
    const userAgent = req.headers.get("user-agent") || "";
    let device = "Desktop";
    if (/mobile/i.test(userAgent)) {
      device = "Mobile";
    } else if (/tablet|ipad/i.test(userAgent)) {
      device = "Tablet";
    }

    // Get approximate location from IP (using CF headers if available)
    const cfCountry = req.headers.get("cf-ipcountry");
    const location = cfCountry || "Unknown";

    // Hash the IP for privacy
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";
    
    // Simple hash for privacy
    const ipHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(ip + profileId)
    ).then(hash => {
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, 16);
    });

    // Insert the view record
    const { error } = await supabaseClient
      .from("profile_views")
      .insert({
        profile_id: profileId,
        viewer_ip_hash: ipHash,
        viewer_location: location,
        viewer_device: device,
        viewer_referrer: referrer || null,
      });

    if (error) {
      console.error("[track-profile-view] Insert error:", error);
      throw error;
    }

    console.log("[track-profile-view] View tracked successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[track-profile-view] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Failed to track view" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);