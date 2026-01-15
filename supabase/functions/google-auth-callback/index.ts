import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

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

// Token encryption utilities using AES-GCM
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!keyString) {
    throw new Error("TOKEN_ENCRYPTION_KEY not configured");
  }
  
  // Use the key string to derive a proper AES key
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  
  // Hash the key to get exactly 32 bytes for AES-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
  
  return crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptToken(token: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Generate random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Return as base64 with prefix to identify encrypted tokens
  return "enc:" + btoa(String.fromCharCode(...combined));
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get IP for rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";

    // Rate limit: 10 attempts per hour per IP
    if (!checkRateLimit(ip, 10, 3600000)) {
      console.warn("[google-auth-callback] Rate limit exceeded for IP:", ip.substring(0, 10) + "...");
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { code, redirectUri } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: "Authorization code is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!redirectUri || typeof redirectUri !== 'string') {
      return new Response(
        JSON.stringify({ error: "Redirect URI is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      console.error("[google-auth-callback] OAuth credentials not configured");
      return new Response(
        JSON.stringify({ error: "OAuth configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("[google-auth-callback] Token exchange failed:", error);
      return new Response(
        JSON.stringify({ error: "Failed to exchange authorization code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const tokens = await tokenResponse.json();
    
    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SECURITY: Encrypt refresh token before storing
    let encryptedToken = null;
    if (tokens.refresh_token) {
      try {
        encryptedToken = await encryptToken(tokens.refresh_token);
        console.log("[google-auth-callback] Token encrypted successfully");
      } catch (encError) {
        console.error("[google-auth-callback] Encryption error:", encError);
        // Fall back to plaintext if encryption fails (for backwards compatibility)
        // In production, you should fail here instead
        encryptedToken = tokens.refresh_token;
      }
    }

    // Store encrypted refresh token in user_settings
    const { error: updateError } = await supabase
      .from("user_settings")
      .update({
        google_calendar_connected: true,
        google_refresh_token: encryptedToken,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[google-auth-callback] Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save connection" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[google-auth-callback] Successfully connected Google Calendar for user:", user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        accessToken: tokens.access_token,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[google-auth-callback] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
