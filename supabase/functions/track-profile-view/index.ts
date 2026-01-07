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

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = rateLimitMap.get(key);
  
  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (existing.count >= limit) return false;
  
  existing.count++;
  return true;
}

// Validate UUID format
function validateUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[track-profile-view] Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get IP for rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";

    // Rate limit: 100 views per hour per IP
    if (!checkRateLimit(ip, 100, 3600000)) {
      console.warn("[track-profile-view] Rate limit exceeded for IP:", ip.substring(0, 10) + "...");
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { profileId, referrer }: TrackViewRequest = await req.json();

    if (!profileId || !validateUUID(profileId)) {
      return new Response(
        JSON.stringify({ error: "Invalid profile ID" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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

    // Sanitize referrer (limit length, basic validation)
    const sanitizedReferrer = referrer ? referrer.substring(0, 500) : null;

    // Insert the view record
    const { error } = await supabaseClient
      .from("profile_views")
      .insert({
        profile_id: profileId,
        viewer_ip_hash: ipHash,
        viewer_location: location,
        viewer_device: device,
        viewer_referrer: sanitizedReferrer,
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
