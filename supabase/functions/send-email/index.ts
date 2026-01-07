import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "Buizly <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "welcome" | "contactRequest" | "cardConnection";
  to: string;
  payload: Record<string, any>;
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

// HTML escape utility to prevent injection
const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[char] || char;
  });
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Require authentication
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

    // Rate limit: 10 emails per hour per user
    if (!checkRateLimit(user.id, 10, 3600000)) {
      console.warn("[Buizly Email] Rate limit exceeded for user:", user.id);
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, to, payload }: EmailRequest = await req.json();

    console.log(`[Buizly Email] Sending ${type} email to ${to} by user ${user.id}`);

    let subject = "";
    let html = "";

    switch (type) {
      case "welcome":
        subject = "Welcome to Buizly! 🎉";
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #00FF4D;">Welcome to Buizly, ${escapeHtml(payload.name)}!</h1>
            <p>You're all set up and ready to start networking smarter.</p>
            <p>With Buizly, you can:</p>
            <ul>
              <li>Share your digital business card instantly via QR code</li>
              <li>Manage your professional connections</li>
              <li>Schedule and track meetings</li>
              <li>Never lose a contact again</li>
            </ul>
            <a href="${escapeHtml(payload.profileUrl)}" style="display: inline-block; background: #00FF4D; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Your Profile</a>
            <p style="margin-top: 32px; color: #666; font-size: 14px;">Happy networking!<br>The Buizly Team</p>
          </div>
        `;
        break;

      case "contactRequest":
        subject = `${escapeHtml(payload.visitorName)} wants to connect with you`;
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #00FF4D;">New Connection Request</h1>
            <p><strong>${escapeHtml(payload.visitorName)}</strong> ${payload.visitorEmail ? `(${escapeHtml(payload.visitorEmail)})` : ""} wants to connect with you on Buizly.</p>
            ${payload.message ? `<p style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;"><em>"${escapeHtml(payload.message)}"</em></p>` : ""}
            <p><strong>Contact Details:</strong></p>
            <ul>
              ${payload.visitorEmail ? `<li>Email: ${escapeHtml(payload.visitorEmail)}</li>` : ""}
              ${payload.visitorPhone ? `<li>Phone: ${escapeHtml(payload.visitorPhone)}</li>` : ""}
            </ul>
            <a href="${escapeHtml(payload.appUrl)}" style="display: inline-block; background: #00FF4D; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View in Buizly</a>
          </div>
        `;
        break;

      case "cardConnection":
        subject = `${escapeHtml(payload.userName)} shared their Buizly card with you`;
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #00FF4D;">${escapeHtml(payload.userName)} shared their digital business card</h1>
            <div style="background: #f5f5f5; padding: 24px; border-radius: 12px; margin: 24px 0;">
              <h2 style="margin: 0 0 8px 0;">${escapeHtml(payload.userName)}</h2>
              ${payload.jobTitle ? `<p style="margin: 4px 0; color: #00FF4D; font-weight: 600;">${escapeHtml(payload.jobTitle)}</p>` : ""}
              ${payload.company ? `<p style="margin: 4px 0; color: #666;">${escapeHtml(payload.company)}</p>` : ""}
              ${payload.email ? `<p style="margin: 8px 0;">📧 ${escapeHtml(payload.email)}</p>` : ""}
              ${payload.phone ? `<p style="margin: 8px 0;">📱 ${escapeHtml(payload.phone)}</p>` : ""}
            </div>
            <a href="${escapeHtml(payload.cardUrl)}" style="display: inline-block; background: #00FF4D; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Save Contact</a>
            <p style="margin-top: 32px; color: #666; font-size: 14px;">Download Buizly to create your own digital business card!</p>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const emailResponse = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
    });

    console.log(`[Buizly Email] Successfully sent ${type} email. ID: ${emailResponse.data?.id}`);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[Buizly Email] Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: "Unable to send email. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
