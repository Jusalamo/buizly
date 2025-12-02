import { supabase } from "@/integrations/supabase/client";

interface EmailPayload {
  to: string;
  [key: string]: any;
}

/**
 * Core email sending function - calls the Resend edge function
 */
export async function sendBuizlyEmail(
  type: "welcome" | "contactRequest" | "cardConnection",
  payload: EmailPayload
) {
  console.log(`[emailService] Sending ${type} email to ${payload.to}`);

  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        type,
        to: payload.to,
        payload,
      },
    });

    if (error) {
      console.error(`[emailService] Error sending ${type} email:`, error);
      throw error;
    }

    console.log(`[emailService] Successfully sent ${type} email. Response ID:`, data?.data?.id);
    return data;
  } catch (error: any) {
    console.error(`[emailService] Failed to send ${type} email:`, error.message);
    throw error;
  }
}

/**
 * Send welcome email when user signs up
 */
export async function sendWelcomeEmail(userEmail: string, userName: string, profileUrl: string) {
  return sendBuizlyEmail("welcome", {
    to: userEmail,
    name: userName,
    profileUrl,
  });
}

/**
 * Send email notification when someone requests to connect
 */
export async function sendContactRequestEmail(
  recipientEmail: string,
  visitorName: string,
  visitorEmail?: string,
  visitorPhone?: string,
  message?: string,
  appUrl?: string
) {
  return sendBuizlyEmail("contactRequest", {
    to: recipientEmail,
    visitorName,
    visitorEmail,
    visitorPhone,
    message,
    appUrl: appUrl || window.location.origin,
  });
}

/**
 * Send email when someone shares their digital business card
 */
export async function sendCardConnectionEmail(
  recipientEmail: string,
  userName: string,
  jobTitle?: string,
  company?: string,
  email?: string,
  phone?: string,
  cardUrl?: string
) {
  return sendBuizlyEmail("cardConnection", {
    to: recipientEmail,
    userName,
    jobTitle,
    company,
    email,
    phone,
    cardUrl: cardUrl || window.location.origin,
  });
}
