export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const { base64, mediaType } = req.body;

    if (!base64 || !mediaType) {
      return res.status(400).json({ error: "Missing image data" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1000,
        system: `You are an expert ophthalmology researcher specializing in laser-induced choroidal neovascularization (CNV) mouse models. You will analyze OCT (Optical Coherence Tomography) images taken immediately after laser photocoagulation in C57BL/6 mice.

Your task is to classify each image into one of three categories based on OCT features:

SUCCESSFUL - Full Bruch's membrane rupture:
- Clear hyperreflective vertical column extending through retinal layers
- Obvious discontinuity/break in the RPE/BM hyperreflective band
- "Butterfly-like" or V-shaped retinal elevation on both sides of the lesion
- Disruption of IS/OS (photoreceptor) layer at the lesion site
- Vaporization track visible through inner retinal layers

PARTIAL - Incomplete rupture:
- Hyperreflective changes at RPE/BM level but without full-thickness break
- Incomplete or asymmetric retinal elevation
- Subtle disruption that doesn't clearly penetrate through BM
- Ambiguous findings that suggest some but not complete membrane perforation

FAILURE - No rupture:
- No significant hyperreflective column
- RPE/BM band appears intact and continuous
- No retinal layer disruption
- Retinal architecture essentially normal or only mildly disturbed

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "classification": "SUCCESS" or "PARTIAL" or "FAILURE",
  "confidence": "HIGH" or "MEDIUM" or "LOW",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "recommendation": "brief action recommendation in Traditional Chinese"
}`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: "Analyze this OCT image taken immediately after laser photocoagulation in a CNV mouse model. Classify the result and provide your findings.",
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "API error" });
    }

    const text = data.content?.map((b) => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
}
