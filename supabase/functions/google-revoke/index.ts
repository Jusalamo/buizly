import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log("[google-revoke] Token not encrypted, using plaintext (legacy)");
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    // Get user's Google refresh token (encrypted)
    const { data: settings } = await supabase
      .from("user_settings")
      .select("google_refresh_token")
      .eq("user_id", user.id)
      .single();

    if (settings?.google_refresh_token) {
      try {
        // Decrypt token before revoking
        const refreshToken = await decryptToken(settings.google_refresh_token);
        
        // Revoke the token with Google
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${refreshToken}`,
          { method: "POST" }
        );
        console.log("[google-revoke] Token revoked successfully");
      } catch (decryptError) {
        console.error("[google-revoke] Decryption error:", decryptError);
        // Continue to clear the token anyway
      }
    }

    // Clear tokens from database
    const { error: updateError } = await supabase
      .from("user_settings")
      .update({
        google_calendar_connected: false,
        google_refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error revoking Google Calendar:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});