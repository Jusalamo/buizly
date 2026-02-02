import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { noteId, content, extractOnly } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt based on what's requested
    let systemPrompt: string;
    let userPrompt: string;

    if (extractOnly === 'actionItems') {
      systemPrompt = `You are an assistant that extracts action items from meeting notes. 
Return a JSON array of action items with the following structure:
[
  {
    "id": "unique-id",
    "text": "Description of the action item",
    "assignee": "Person responsible (if mentioned)",
    "deadline": "Due date in ISO format (if mentioned)",
    "completed": false
  }
]
Only return the JSON array, no other text.`;
      userPrompt = `Extract all action items from these meeting notes:\n\n${content}`;
    } else {
      systemPrompt = `You are an expert meeting notes analyzer. Analyze the provided meeting content and return a JSON object with the following structure:
{
  "title": "A concise, descriptive title for the meeting (max 60 chars)",
  "summary": "A clear, concise summary of the meeting (2-4 sentences)",
  "decisions": ["List of key decisions made during the meeting"],
  "actionItems": [
    {
      "id": "unique-id",
      "text": "Description of the action item",
      "assignee": "Person responsible (if mentioned)",
      "deadline": "Due date in ISO format (if mentioned)",
      "completed": false
    }
  ],
  "highlights": ["Key quotes or important points worth highlighting"]
}
Only return the JSON object, no other text.`;
      userPrompt = `Analyze these meeting notes and extract the summary, decisions, action items, and highlights:\n\n${content}`;
    }

    // Note: Since Lovable AI Gateway is disabled, we need to use a fallback approach
    // For now, we'll do basic text analysis without AI
    // When AI Gateway is enabled, this would call the Lovable AI endpoint
    
    // Fallback: Basic extraction without AI
    const lines = content.split('\n').filter((l: string) => l.trim());
    const firstLine = lines[0] || 'Meeting Notes';
    
    // Basic action item detection
    const actionPatterns = [
      /(?:action|todo|task|follow[- ]?up):\s*(.+)/gi,
      /(?:@\w+|assigned to \w+):\s*(.+)/gi,
      /\[\s*\]\s*(.+)/g, // Unchecked checkboxes
      /(?:need to|must|should|will)\s+(.+?)(?:\.|$)/gi,
    ];
    
    const actionItems: Array<{id: string; text: string; assignee: string; deadline: string; completed: boolean}> = [];
    let matchId = 0;
    
    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        actionItems.push({
          id: `action-${++matchId}`,
          text: match[1].trim(),
          assignee: '',
          deadline: '',
          completed: false,
        });
      }
    }
    
    // Basic decision detection
    const decisionPatterns = [
      /(?:decided|agreed|confirmed|approved)(?:\s+(?:to|that))?\s*[:.]?\s*(.+?)(?:\.|$)/gi,
      /decision:\s*(.+)/gi,
    ];
    
    const decisions: string[] = [];
    for (const pattern of decisionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        decisions.push(match[1].trim());
      }
    }

    // Create summary from first few sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const summary = sentences.slice(0, 3).join(' ').trim() || 'No summary available.';

    const result = {
      title: firstLine.substring(0, 60),
      summary,
      decisions: decisions.length > 0 ? decisions : ['No decisions recorded'],
      actionItems,
      highlights: sentences.slice(0, 2).map((s: string) => s.trim()),
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in generate-note-summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
