import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, payload }: EmailRequest = await req.json();

    console.log(`[Buizly Email] Sending ${type} email to ${to}`);

    let subject = "";
    let html = "";

    switch (type) {
      case "welcome":
        subject = "Welcome to Buizly! 🎉";
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #00FF4D;">Welcome to Buizly, ${payload.name}!</h1>
            <p>You're all set up and ready to start networking smarter.</p>
            <p>With Buizly, you can:</p>
            <ul>
              <li>Share your digital business card instantly via QR code</li>
              <li>Manage your professional connections</li>
              <li>Schedule and track meetings</li>
              <li>Never lose a contact again</li>
            </ul>
            <a href="${payload.profileUrl}" style="display: inline-block; background: #00FF4D; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Your Profile</a>
            <p style="margin-top: 32px; color: #666; font-size: 14px;">Happy networking!<br>The Buizly Team</p>
          </div>
        `;
        break;

      case "contactRequest":
        subject = `${payload.visitorName} wants to connect with you`;
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #00FF4D;">New Connection Request</h1>
            <p><strong>${payload.visitorName}</strong> ${payload.visitorEmail ? `(${payload.visitorEmail})` : ""} wants to connect with you on Buizly.</p>
            ${payload.message ? `<p style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;"><em>"${payload.message}"</em></p>` : ""}
            <p><strong>Contact Details:</strong></p>
            <ul>
              ${payload.visitorEmail ? `<li>Email: ${payload.visitorEmail}</li>` : ""}
              ${payload.visitorPhone ? `<li>Phone: ${payload.visitorPhone}</li>` : ""}
            </ul>
            <a href="${payload.appUrl}" style="display: inline-block; background: #00FF4D; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View in Buizly</a>
          </div>
        `;
        break;

      case "cardConnection":
        subject = `${payload.userName} shared their Buizly card with you`;
        html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #00FF4D;">${payload.userName} shared their digital business card</h1>
            <div style="background: #f5f5f5; padding: 24px; border-radius: 12px; margin: 24px 0;">
              <h2 style="margin: 0 0 8px 0;">${payload.userName}</h2>
              ${payload.jobTitle ? `<p style="margin: 4px 0; color: #00FF4D; font-weight: 600;">${payload.jobTitle}</p>` : ""}
              ${payload.company ? `<p style="margin: 4px 0; color: #666;">${payload.company}</p>` : ""}
              ${payload.email ? `<p style="margin: 8px 0;">📧 ${payload.email}</p>` : ""}
              ${payload.phone ? `<p style="margin: 8px 0;">📱 ${payload.phone}</p>` : ""}
            </div>
            <a href="${payload.cardUrl}" style="display: inline-block; background: #00FF4D; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Save Contact</a>
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
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
