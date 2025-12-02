import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MeetingInvitationRequest {
  meetingId: string;
  participantEmail: string;
  participantName?: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  meetingLocation?: string;
  meetingDescription?: string;
  organizerName: string;
  organizerEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-meeting-invitation] Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const invitation: MeetingInvitationRequest = await req.json();
    console.log(`[send-meeting-invitation] Sending to ${invitation.participantEmail}`);

    const appUrl = 'https://preview--buizly-digital-business-card.lovable.app';
    
    // Create accept/decline links
    const acceptLink = `${appUrl}/meeting/${invitation.meetingId}?action=accept`;
    const declineLink = `${appUrl}/meeting/${invitation.meetingId}?action=decline`;

    // Send email using Resend via fetch
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a; color: #ffffff; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: #1a1a1a; border-radius: 16px; padding: 32px; border: 1px solid #333; }
          .header { text-align: center; margin-bottom: 24px; }
          .logo { font-size: 28px; font-weight: bold; color: #00FF4D; }
          h1 { font-size: 24px; margin: 0 0 8px 0; color: #ffffff; }
          .subtitle { color: #888; font-size: 14px; }
          .meeting-details { background: #222; border-radius: 12px; padding: 20px; margin: 24px 0; }
          .detail-row { display: flex; margin-bottom: 12px; align-items: flex-start; }
          .detail-row:last-child { margin-bottom: 0; }
          .detail-label { color: #888; font-size: 12px; text-transform: uppercase; min-width: 80px; }
          .detail-value { color: #fff; font-size: 14px; }
          .organizer { background: #222; border-radius: 12px; padding: 16px; margin: 24px 0; display: flex; align-items: center; gap: 12px; }
          .organizer-avatar { width: 40px; height: 40px; border-radius: 50%; background: #00FF4D; display: flex; align-items: center; justify-content: center; color: #000; font-weight: bold; }
          .organizer-info { flex: 1; }
          .organizer-name { font-weight: 600; color: #fff; }
          .organizer-email { font-size: 12px; color: #888; }
          .buttons { display: flex; gap: 12px; margin-top: 24px; }
          .btn { flex: 1; padding: 14px 24px; border-radius: 8px; text-decoration: none; text-align: center; font-weight: 600; font-size: 14px; display: inline-block; }
          .btn-accept { background: #00FF4D; color: #000; }
          .btn-decline { background: transparent; color: #ff4d4d; border: 1px solid #ff4d4d; }
          .footer { text-align: center; margin-top: 32px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="logo">Buizly</div>
            </div>
            
            <h1>You're Invited!</h1>
            <p class="subtitle">${invitation.organizerName} has invited you to a meeting</p>
            
            <div class="meeting-details">
              <div class="detail-row">
                <span class="detail-label">Title</span>
                <span class="detail-value">${invitation.meetingTitle}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${new Date(invitation.meetingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time</span>
                <span class="detail-value">${invitation.meetingTime}</span>
              </div>
              ${invitation.meetingLocation ? `
              <div class="detail-row">
                <span class="detail-label">Location</span>
                <span class="detail-value">${invitation.meetingLocation}</span>
              </div>
              ` : ''}
              ${invitation.meetingDescription ? `
              <div class="detail-row">
                <span class="detail-label">Details</span>
                <span class="detail-value">${invitation.meetingDescription}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="organizer">
              <div class="organizer-avatar">${invitation.organizerName.charAt(0).toUpperCase()}</div>
              <div class="organizer-info">
                <div class="organizer-name">${invitation.organizerName}</div>
                <div class="organizer-email">${invitation.organizerEmail}</div>
              </div>
            </div>
            
            <div class="buttons">
              <a href="${acceptLink}" class="btn btn-accept">Accept</a>
              <a href="${declineLink}" class="btn btn-decline">Decline</a>
            </div>
            
            <div class="footer">
              <p>You can also respond by opening the Buizly app</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Buizly <onboarding@resend.dev>",
        to: [invitation.participantEmail],
        subject: `Meeting Invitation: ${invitation.meetingTitle}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("[send-meeting-invitation] Email error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("[send-meeting-invitation] Email sent:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-meeting-invitation] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
