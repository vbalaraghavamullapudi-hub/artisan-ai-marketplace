import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is missing from Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const { image, mimeType, language } = await request.json();

    if (!image || !mimeType || !language) {
      return NextResponse.json(
        { error: "Please upload an image and select a language." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: "Please use a JPG, PNG, or WEBP image." },
        { status: 400 }
      );
    }

    const prompt = `
You are ArtisanAI, an assistant helping local Indian artisans
sell their products online.

Analyze the uploaded product photograph and create a marketplace
listing in ${language}.

Include:
1. Product name based on visible evidence.
2. Attractive but truthful product description.
3. Visible colors, patterns, shapes, and design details.
4. Possible uses and occasions.
5. Search keywords.
6. An illustrative price range in Indian rupees.

Important rules:
- Write the listing in ${language}.
- Describe only details supported by the image.
- Do not assume an item is handmade or claim its materials
  without sufficient evidence.
- Clearly label the price as an estimate.
- Tell the artisan to verify prices against their local market.
- Format the result with clear headings.
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.7,
          max_completion_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return NextResponse.json(
        {
          error:
            data.error?.message ||
            "The AI service could not process your request. Please try again."
        },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      return NextResponse.json(
        { error: "The AI returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      text,
      demoMode: false
    });

  } catch (error) {
    console.error("ArtisanAI error:", error);

    return NextResponse.json(
      { error: "Unable to generate the listing. Please try again." },
      { status: 500 }
    );
  }
}
