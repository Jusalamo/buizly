import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const LOVABLE_AI_GATEWAY_URL = 'https://ai-gateway.lovable.dev/chat/completions';

interface ActionItem {
  task: string;
  assignee?: string;
  deadline?: string;
}

interface NoteSummary {
  title: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  highlights: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, meetingTitle, attendees } = await req.json();

    if (!content || content.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if Lovable AI Gateway is available
    if (!LOVABLE_API_KEY) {
      // Return basic manual processing suggestion
      return new Response(
        JSON.stringify({
          title: meetingTitle || 'Meeting Notes',
          summary: 'AI summary generation requires API key configuration.',
          decisions: [],
          actionItems: [],
          highlights: [],
          requiresSetup: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert meeting notes summarizer. Analyze the provided meeting notes or transcript and extract:
1. A concise title (if not provided)
2. A brief summary (2-3 sentences)
3. Key decisions made
4. Action items with assignees and deadlines if mentioned
5. Important highlights or quotes

Respond in JSON format matching this structure:
{
  "title": "string",
  "summary": "string", 
  "decisions": ["string"],
  "actionItems": [{"task": "string", "assignee": "string or null", "deadline": "string or null"}],
  "highlights": ["string"]
}`;

    const userPrompt = `Meeting: ${meetingTitle || 'Unknown'}
Attendees: ${attendees?.join(', ') || 'Unknown'}

Notes/Transcript:
${content}`;

    const response = await fetch(LOVABLE_AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const resultText = aiResponse.choices?.[0]?.message?.content;

    if (!resultText) {
      throw new Error('No response from AI');
    }

    const summary: NoteSummary = JSON.parse(resultText);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error generating summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
