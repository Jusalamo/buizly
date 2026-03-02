import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseContactFields(text: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Email
  const emailMatch = text.match(
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
  );
  const email = emailMatch ? emailMatch[0] : "";

  // Phone - various formats
  const phoneMatch = text.match(
    /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/
  );
  const phone = phoneMatch ? phoneMatch[0].trim() : "";

  // Website
  const websiteMatch = text.match(
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/
  );
  const website = websiteMatch
    ? websiteMatch[0].replace(/^https?:\/\//, "")
    : "";

  // Try to find name - usually first line or line before title
  let name = "";
  let title = "";
  let company = "";
  let address = "";

  // Common title keywords
  const titleKeywords = [
    "ceo", "cto", "cfo", "coo", "vp", "director", "manager", "president",
    "founder", "partner", "associate", "analyst", "engineer", "developer",
    "designer", "consultant", "advisor", "lead", "head", "chief", "officer",
    "specialist", "coordinator", "executive", "supervisor",
  ];

  const addressKeywords = [
    "street", "st.", "ave", "avenue", "blvd", "boulevard", "road", "rd.",
    "drive", "dr.", "suite", "floor", "building",
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Skip lines that are email, phone, or website
    if (
      emailMatch && line.includes(emailMatch[0]) ||
      phoneMatch && line.includes(phoneMatch[0]) ||
      websiteMatch && line.includes(websiteMatch[0])
    ) {
      continue;
    }

    // Check if it's an address
    if (addressKeywords.some((k) => lower.includes(k)) || /\d{5}/.test(line)) {
      address = address ? address + ", " + line : line;
      continue;
    }

    // Check if it's a title
    if (titleKeywords.some((k) => lower.includes(k)) && !title) {
      title = line;
      continue;
    }

    // First non-matched meaningful line is likely the name
    if (!name && line.length > 2 && line.length < 50 && !/\d/.test(line)) {
      name = line;
      continue;
    }

    // Next non-matched line could be company
    if (
      name && !company && line.length > 1 && line.length < 60 &&
      !lower.includes("@")
    ) {
      company = line;
    }
  }

  return { name, company, title, phone, email, address, website };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use Lovable AI (Gemini) for OCR
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Strip data URL prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, "");

    const response = await fetch(
      "https://api.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract ALL text from this business card image. Return ONLY the raw text, line by line, exactly as it appears on the card. Do not add any commentary or formatting.",
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(
        JSON.stringify({ error: "OCR extraction failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";

    // Parse extracted text into structured fields
    const fields = parseContactFields(extractedText);

    return new Response(
      JSON.stringify({ fields, rawText: extractedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("OCR error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
