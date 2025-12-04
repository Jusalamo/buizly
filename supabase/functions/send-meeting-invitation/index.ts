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
    
    // Send email using Resend via fetch
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Include participant email in the response links for tracking
    const acceptLink = `${appUrl}/meeting-response/${invitation.meetingId}?action=accept&email=${encodeURIComponent(invitation.participantEmail)}`;
    const declineLink = `${appUrl}/meeting-response/${invitation.meetingId}?action=decline&email=${encodeURIComponent(invitation.participantEmail)}`;

    // Email HTML optimized for deliverability and client compatibility
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="x-apple-disable-message-reformatting">
        <title>Meeting Invitation from ${invitation.organizerName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 32px 32px 16px 32px;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #00CC3D;">Buizly</h1>
                  </td>
                </tr>
                
                <!-- Title -->
                <tr>
                  <td style="padding: 0 32px;">
                    <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #1a1a1a;">You're Invited!</h2>
                    <p style="margin: 0; font-size: 14px; color: #666666;">${invitation.organizerName} has invited you to a meeting</p>
                  </td>
                </tr>
                
                <!-- Meeting Details -->
                <tr>
                  <td style="padding: 24px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9f9f9; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="display: inline-block; width: 80px; font-size: 12px; color: #888888; text-transform: uppercase;">Title</span>
                                <span style="font-size: 14px; color: #1a1a1a;">${invitation.meetingTitle}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="display: inline-block; width: 80px; font-size: 12px; color: #888888; text-transform: uppercase;">Date</span>
                                <span style="font-size: 14px; color: #1a1a1a;">${new Date(invitation.meetingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="display: inline-block; width: 80px; font-size: 12px; color: #888888; text-transform: uppercase;">Time</span>
                                <span style="font-size: 14px; color: #1a1a1a;">${invitation.meetingTime}</span>
                              </td>
                            </tr>
                            ${invitation.meetingLocation ? `
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="display: inline-block; width: 80px; font-size: 12px; color: #888888; text-transform: uppercase;">Location</span>
                                <span style="font-size: 14px; color: #1a1a1a;">${invitation.meetingLocation}</span>
                              </td>
                            </tr>
                            ` : ''}
                            ${invitation.meetingDescription ? `
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="display: inline-block; width: 80px; font-size: 12px; color: #888888; text-transform: uppercase;">Details</span>
                                <span style="font-size: 14px; color: #1a1a1a;">${invitation.meetingDescription}</span>
                              </td>
                            </tr>
                            ` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Organizer -->
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9f9f9; border-radius: 12px;">
                      <tr>
                        <td style="padding: 16px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td style="vertical-align: middle; padding-right: 12px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #00CC3D; color: #000000; font-weight: bold; font-size: 16px; text-align: center; line-height: 40px;">
                                  ${invitation.organizerName.charAt(0).toUpperCase()}
                                </div>
                              </td>
                              <td style="vertical-align: middle;">
                                <div style="font-weight: 600; color: #1a1a1a; font-size: 14px;">${invitation.organizerName}</div>
                                <div style="font-size: 12px; color: #888888;">${invitation.organizerEmail}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Buttons -->
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding-right: 8px;" width="50%">
                          <a href="${acceptLink}" target="_blank" style="display: block; padding: 14px 24px; background-color: #00CC3D; color: #000000; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; text-align: center;">Accept</a>
                        </td>
                        <td align="center" style="padding-left: 8px;" width="50%">
                          <a href="${declineLink}" target="_blank" style="display: block; padding: 14px 24px; background-color: #ffffff; color: #dc2626; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; text-align: center; border: 1px solid #dc2626;">Decline</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 24px 32px; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0; font-size: 12px; color: #888888;">
                      You can also respond by opening the Buizly app
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #aaaaaa;">
                      © ${new Date().getFullYear()} Buizly. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
        headers: {
          "X-Entity-Ref-ID": invitation.meetingId,
        },
      }),
    });

    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("[send-meeting-invitation] Email error:", emailData);
      
      // Handle Resend free tier limitation gracefully
      if (emailData.statusCode === 403 && emailData.name === "validation_error") {
        console.warn("[send-meeting-invitation] Resend domain not verified - email skipped");
        return new Response(JSON.stringify({ 
          success: true, 
          emailSent: false, 
          warning: "Email notification skipped - domain verification required at resend.com/domains" 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("[send-meeting-invitation] Email sent:", emailData);

    return new Response(JSON.stringify({ success: true, emailSent: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-meeting-invitation] Error:", error.message);
    // Return generic error message to avoid exposing internal details
    return new Response(
      JSON.stringify({ error: "Unable to send invitation. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
