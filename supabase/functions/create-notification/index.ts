import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const validTypes = [
  'meeting_request',
  'meeting_confirmed', 
  'meeting_declined',
  'meeting_cancelled',
  'meeting_rescheduled',
  'meeting_reminder',
  'new_participant',
  'profile_shared',
  'new_connection',
  'follow_up_scheduled'
];

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(userId);
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (limit.count >= 10) {
    return false;
  }
  
  limit.count++;
  return true;
}

function validateUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function sanitizeString(str: string, maxLength: number): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .substring(0, maxLength);
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[create-notification] Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    
    // Validate required fields
    if (!body.user_id || !validateUUID(body.user_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid user_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!body.type || !validTypes.includes(body.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!body.title || typeof body.title !== 'string' || body.title.length < 1) {
      return new Response(
        JSON.stringify({ error: "Title is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!body.message || typeof body.message !== 'string' || body.message.length < 1) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limit check per authenticated user
    if (!checkRateLimit(user.id)) {
      console.warn("[create-notification] Rate limit exceeded for user:", user.id);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeString(body.title, 200);
    const sanitizedMessage = sanitizeString(body.message, 500);

    // Sanitize data field
    let sanitizedData = null;
    if (body.data && typeof body.data === 'object') {
      const sanitizeValue = (val: any): any => {
        if (typeof val === 'string') {
          return sanitizeString(val, 1000);
        }
        if (Array.isArray(val)) {
          return val.slice(0, 50).map(sanitizeValue);
        }
        if (typeof val === 'object' && val !== null) {
          const sanitized: Record<string, any> = {};
          const entries = Object.entries(val).slice(0, 20);
          for (const [k, v] of entries) {
            sanitized[k.substring(0, 50)] = sanitizeValue(v);
          }
          return sanitized;
        }
        return val;
      };
      sanitizedData = sanitizeValue(body.data);
    }

    // Insert notification using service role (bypasses RLS)
    const { data, error } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: body.user_id,
        type: body.type,
        title: sanitizedTitle,
        message: sanitizedMessage,
        data: sanitizedData,
      })
      .select()
      .single();

    if (error) {
      console.error("[create-notification] Insert error:", error);
      throw error;
    }

    console.log("[create-notification] Created notification:", data.id);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[create-notification] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
