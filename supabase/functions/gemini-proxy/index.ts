// Supabase Edge Function: gemini-proxy
//
// The Gemini API key must never ship in the frontend bundle - anyone who
// views source on the deployed app could lift it and burn your quota. This
// function holds the key server-side and does the actual Gemini call; the
// browser only ever sends the inventory data + question, never the key.
// Prompt-building and row caps live here (not just in the client) so a
// caller can't bypass them by hand-crafting a request.
//
// Deploy via CLI:   supabase functions deploy gemini-proxy
// Deploy via browser: Dashboard -> Edge Functions -> Deploy a new function ->
//   "Via Editor" -> name it "gemini-proxy" -> paste this whole file -> Deploy
// Either way, set the secret first (Dashboard -> Edge Functions -> Secrets,
// or `supabase secrets set GEMINI_API_KEY=<your key>`).

import { GoogleGenAI } from 'npm:@google/genai@1.40.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL = 'gemini-3-flash-preview';
const ASK_MAX_ROWS = 500;
const SUMMARY_MAX_ROWS = 100;

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const buildAskPrompt = (query: string, data: unknown[]) => {
  const sample = data.slice(0, ASK_MAX_ROWS);
  return `
    You are a Data Quality Assistant. You have access to the following inventory dataset (showing first ${sample.length} rows):

    ${JSON.stringify(sample)}

    User Query: "${query}"

    Please provide a concise and helpful answer based on this data.
    If the user asks for calculations, perform them on the provided data.
    Format your response nicely with markdown.
  `;
};

const buildSummaryPrompt = (data: unknown[]) => {
  const sample = data.slice(0, SUMMARY_MAX_ROWS);
  return `
    Analyze this inventory data sample:
    ${JSON.stringify(sample)}

    Provide a 3-bullet point executive summary of what this data contains (columns, potential data quality issues, general topic).
  `;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!GEMINI_API_KEY) {
    return json({ error: 'Gemini API key is not configured on the server.' }, 500);
  }

  try {
    const { mode, query, data } = await req.json();

    if (!Array.isArray(data) || data.length === 0) {
      return json({ text: mode === 'ask' ? 'No inventory data is currently loaded.' : '' });
    }

    let prompt: string;
    if (mode === 'ask') {
      if (typeof query !== 'string' || !query.trim()) {
        return json({ error: 'query is required for mode "ask".' }, 400);
      }
      prompt = buildAskPrompt(query, data);
    } else if (mode === 'summary') {
      prompt = buildSummaryPrompt(data);
    } else {
      return json({ error: 'mode must be "ask" or "summary".' }, 400);
    }

    const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
    return json({ text: response.text || (mode === 'ask' ? "I couldn't generate an answer based on the data provided." : '') });
  } catch (err) {
    console.error('Gemini proxy error:', err);
    return json({ error: 'Sorry, the AI service failed to process this request.' }, 500);
  }
});
