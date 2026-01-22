import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// Token decryption utilities using AES-GCM
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

async function decryptToken(encryptedToken: string): Promise<string> {
  // Check if token is encrypted (has enc: prefix)
  if (!encryptedToken.startsWith("enc:")) {
    // Return as-is for backwards compatibility with plaintext tokens
    console.log("[google-create-event] Token not encrypted, using plaintext (legacy)");
    return encryptedToken;
  }
  
  const key = await getEncryptionKey();
  
  // Remove prefix and decode base64
  const base64Data = encryptedToken.substring(4);
  const combined = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes) and encrypted data
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

async function refreshAccessToken(encryptedRefreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

  // Decrypt the refresh token before using
  const refreshToken = await decryptToken(encryptedRefreshToken);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[google-create-event] Token refresh failed:", errorText);
    throw new Error("Failed to refresh access token");
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req: Request) => {
  // Handle CORS preflight with restricted origins
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const { title, description, startDateTime, endDateTime, location, attendees } = await req.json();
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Google refresh token (encrypted)
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("google_refresh_token")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings?.google_refresh_token) {
      return new Response(
        JSON.stringify({ error: "Google Calendar not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh access token (handles decryption internally)
    const accessToken = await refreshAccessToken(settings.google_refresh_token);

    // Create calendar event
    const event = {
      summary: title,
      description: description || "",
      location: location || "",
      start: {
        dateTime: startDateTime,
        timeZone: "UTC",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "UTC",
      },
      attendees: attendees?.map((email: string) => ({ email })) || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 60 },
        ],
      },
    };

    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!calendarResponse.ok) {
      const error = await calendarResponse.text();
      console.error("[google-create-event] Calendar API error:", error);
      return new Response(
        JSON.stringify({ error: "Unable to create calendar event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const calendarEvent = await calendarResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true,
        eventId: calendarEvent.id,
        eventLink: calendarEvent.htmlLink,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[google-create-event] Error:", error.message);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
