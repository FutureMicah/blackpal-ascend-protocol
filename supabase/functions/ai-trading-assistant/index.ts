import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type = "chat" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompts: Record<string, string> = {
      chat: `You are BlackPal AI, an elite trading assistant for the BlackBoard Trading Academy. You're a master of technical analysis, market psychology, and risk management.

Your personality:
- Confident but not arrogant
- Speak with authority on trading matters
- Use trading terminology naturally
- Be encouraging but realistic about risks
- Format responses with emojis for key points

Capabilities:
- Analyze trading setups and patterns
- Explain market concepts clearly
- Provide risk management advice
- Suggest learning resources
- Help with trading psychology

Remember: Never give specific financial advice. Always emphasize risk management and learning.`,

      journal_analysis: `You are BlackPal AI, analyzing a trader's journal entry. Provide insightful feedback on:
- Pattern recognition in their trading behavior
- Emotional patterns and how they affect decisions
- Specific areas for improvement
- Positive reinforcement for good habits
- Actionable suggestions for tomorrow

Be supportive but honest. Use data-driven insights when possible.`,

      market_analysis: `You are BlackPal AI, providing market analysis. Focus on:
- Current market sentiment and trends
- Key support/resistance levels
- Risk factors to watch
- Educational context for patterns
- Always remind about risk management

Never predict specific price targets. Focus on education and awareness.`
    };

    const systemPrompt = systemPrompts[type] || systemPrompts.chat;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
