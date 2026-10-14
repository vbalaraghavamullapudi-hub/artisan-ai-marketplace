import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
try {
const apiKey = process.env.GEMINI_API_KEY;

```
if (!apiKey) {
  return NextResponse.json(
    { error: "Gemini API key is missing. Configure GEMINI_API_KEY in Vercel Environment Variables." },
    { status: 500 }
  );
}

const { image, mimeType, language } = await request.json();

if (!image || !mimeType || !language) {
  return NextResponse.json(
    { error: "Please provide a product image and select a language." },
    { status: 400 }
  );
}

const ai = new GoogleGenAI({ apiKey });

const prompt = `
```

You are ArtisanAI, an assistant that helps local Indian artisans sell handmade products online.

Analyze the uploaded product photo and create a useful marketplace listing in ${language}.

Include:

1. Product name
2. A clear and attractive product description
3. Visible materials, colors, and design details
4. Suggested customer uses or occasions
5. Search keywords
6. An estimated price range in Indian rupees, clearly labelled as an estimate

Rules:

* Use ${language} for the entire listing.
* Do not claim materials, origin, authenticity, or handmade status unless supported by the image or user-provided information.
* If something cannot be identified confidently, say so.
* Make the description appealing but truthful.
* State that the suggested price needs to be checked against local market prices.
  `;

  const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [
  {
  parts: [
  { text: prompt },
  {
  inlineData: {
  mimeType,
  data: image,
  },
  },
  ],
  },
  ],
  });

  return NextResponse.json({ text: response.text });
  } catch (error) {
  console.error("ArtisanAI generation error:", error);

  return NextResponse.json(
  { error: "AI generation failed. Check your API key, quota, and image, then try again." },
  { status: 500 }
  );
  }
  }
