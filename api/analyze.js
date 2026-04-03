export default async function handler(req, res) {
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
      return res.status(400).json({ error: "Missing base64 or mediaType" });
    }

    console.log("mediaType:", mediaType);
    console.log("base64 length:", base64.length);
    console.log("API key prefix:", apiKey.substring(0, 10));

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
        system: `You are an expert ophthalmology researcher specializing in laser-induced choroidal neovascularization (CNV) mouse models. Analyze OCT images taken immediately after laser photocoagulation in C57BL/6 mice.

Classify into: SUCCESS (full BM rupture with hyperreflective column, butterfly shape), PARTIAL (incomplete rupture), or FAILURE (no rupture, intact RPE/BM).

Respond ONLY in this exact JSON format:
{"classification":"SUCCESS" or "PARTIAL" or "FAILURE","confidence":"HIGH" or "MEDIUM" or "LOW","key_findings":["finding1","finding2","finding3"],"recommendation":"brief recommendation in Traditional Chinese"}`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              { type: "text", text: "Analyze this OCT image and classify the Bruch's membrane rupture status." },
            ],
          },
        ],
      }),
    });

    const rawText = await response.text();
    console.log("Anthropic status:", response.status);
    console.log("Anthropic response:", rawText.substring(0, 500));

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Anthropic API error: " + rawText.substring(0, 200) 
      });
    }

    const data = JSON.parse(rawText);
    const text = data.content?.map((b) => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
