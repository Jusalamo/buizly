import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration - restrict to allowed origins for authenticated endpoints
const allowedOrigins = [
  'https://buizly.lovable.app',
  'https://lovable.app',
  'https://lovable.dev',
  'https://buizly.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
];

const allowedOriginPatterns = [
  /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/preview--[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/id-preview--[a-z0-9-]+\.lovable\.app$/,
];

function getCorsHeaders(req: Request): { [key: string]: string } {
  const origin = req.headers.get('origin') || '';
  
  const isAllowed = allowedOrigins.includes(origin) || 
    allowedOriginPatterns.some(pattern => pattern.test(origin));
  
  const allowOrigin = isAllowed ? origin : 'https://buizly.lovable.app';
  
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[google-auth-start] Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Validate the JWT token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log("[google-auth-start] Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("[google-auth-start] Authenticated user:", userId);

    const { redirectUri } = await req.json();
    
    // Validate redirectUri is from allowed domains
    const allowedDomains = [
      "localhost",
      "lovable.app",
      "lovable.dev",
      "buizly.vercel.app"
    ];
    
    try {
      const url = new URL(redirectUri);
      const isAllowed = allowedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );
      
      if (!isAllowed) {
        console.log("[google-auth-start] Invalid redirect URI domain:", url.hostname);
        return new Response(
          JSON.stringify({ error: "Invalid redirect URI" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    } catch {
      console.log("[google-auth-start] Invalid redirect URI format:", redirectUri);
      return new Response(
        JSON.stringify({ error: "Invalid redirect URI format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    if (!clientId) {
      throw new Error("Google OAuth client ID not configured");
    }

    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar"
    );

    const authUrl = 
      `https://accounts.google.com/o/oauth2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${scope}&` +
      `access_type=offline&` +
      `prompt=consent`;

    console.log("[google-auth-start] Generated auth URL for user:", userId);

    return new Response(
      JSON.stringify({ authUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[google-auth-start] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to initiate Google authentication" }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
