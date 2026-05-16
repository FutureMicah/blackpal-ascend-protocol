// Stylize a user-uploaded selfie into a 3D Memoji/Pixar-style avatar that
// preserves the person's actual likeness (skin tone, facial features, hair,
// glasses, accessories). Uses Lovable AI Gateway image-edit model.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STYLE_PROMPT = `Transform this real photograph into a high-end 3D character avatar in the
style of modern Pixar / Apple Memoji / Snapchat Bitmoji rendering, BUT keep the
person's actual likeness intact. Critical requirements:

- Preserve the EXACT skin tone, ethnicity, face shape, eye color, eyebrow shape,
  nose, lips, hair color, hair style, facial hair, glasses, headwear and any
  visible accessories from the original photo. This must clearly look like THIS
  specific person, not a generic character.
- Apply a smooth, glossy 3D-rendered look with soft subsurface skin shading,
  large expressive eyes (slightly stylized but matching original eye color),
  studio rim lighting, and a clean transparent or soft gradient background.
- Head-and-shoulders portrait, centered, facing forward, friendly neutral
  expression unless the original shows a strong expression.
- Squared aspect, sharp focus, no text, no watermark, no logos, no extra people.
- Do NOT change race, gender, age, body type, or distinctive features.

Return only the stylized 3D avatar image.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "imageUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: STYLE_PROMPT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI Gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Stylization failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const stylizedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!stylizedImageUrl) throw new Error("No stylized image returned");

    return new Response(JSON.stringify({ stylizedImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stylize-avatar-3d error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
