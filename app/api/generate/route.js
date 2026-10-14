import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const MODEL = "qwen/qwen3.8-27b";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_LANGUAGES = ["Telugu", "English", "Hindi"];

function jsonError(message, status) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function isValidImageSignature(buffer, mimeType) {
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      )
    );
  }

  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
}

function buildPrompt(language) {
  return `
You are ArtisanAI, an AI marketplace assistant helping local
Indian artisans prepare product listings.

Analyze the supplied product image and create a useful,
truthful marketplace listing.

Write the entire listing in ${language}.

Include these sections:

1. Product title
   Create a concise, searchable title based on visible evidence.

2. Product description
   Describe visible colors, patterns, shapes, design and
   other details supported by the image.

3. Product features
   Explain possible uses and occasions without inventing
   unsupported product characteristics.

4. Estimated price in Indian rupees
   Suggest a reasonable illustrative price range specific
   to this product.

   Consider the apparent product category, visible size,
   design complexity, apparent materials and likely
   production effort when these can reasonably be assessed.

   Do not reuse a generic fixed price range for every product.
   Similar products may have similar estimates, but different
   products should be assessed individually.

   Do not claim to know exact dimensions, material quality,
   production costs or authenticity from an image alone.
   Explain briefly what factors could change the estimate.
   Label the price as an estimate, not a verified market price.
   Do not claim to have checked live market prices.
   Recommend checking comparable local products before selling.

5. Search keywords
   Provide relevant marketplace search terms.

6. Seller tip
   Give one practical suggestion for improving the listing
   or presenting the product to potential buyers.

Important requirements:
- Base the listing on the actual image.
- Never invent details that cannot be reasonably inferred.
- Do not automatically claim the product is handmade.
- If important details are uncertain, say so clearly.
- Use clear headings and readable formatting.
- Keep the response practical for a small artisan business.
- Do not include a demo-mode disclaimer.
`;
}

export async function POST(request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return jsonError(
        "AI service configuration is missing. Please contact the administrator.",
        503
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonError(
        "Please submit the image using a valid JSON request.",
        415
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid request data.", 400);
    }

    const { image, mimeType, language } = body ?? {};

    if (
      typeof image !== "string" ||
      typeof mimeType !== "string" ||
      typeof language !== "string"
    ) {
      return jsonError(
        "Please upload an image and select a language.",
        400
      );
    }

    if (!Object.hasOwn(ALLOWED_TYPES, mimeType)) {
      return jsonError(
        "Please use a JPG, PNG, or WEBP image.",
        400
      );
    }

    if (!ALLOWED_LANGUAGES.includes(language)) {
      return jsonError(
        "Please select Telugu, English, or Hindi.",
        400
      );
    }

    if (
      image.length === 0 ||
      image.length > MAX_BASE64_LENGTH ||
      image.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(image)
    ) {
      return jsonError(
        "The image is empty or too large. Please choose an image under 5 MB.",
        400
      );
    }

    const imageBuffer = Buffer.from(image, "base64");

    if (
      imageBuffer.length === 0 ||
      imageBuffer.length > MAX_IMAGE_BYTES ||
      imageBuffer.toString("base64") !== image
    ) {
      return jsonError("Invalid image data.", 400);
    }

    if (!isValidImageSignature(imageBuffer, mimeType)) {
      return jsonError(
        "The image content does not match its file type. Please upload a valid image.",
        400
      );
    }

    const prompt = buildPrompt(language);

    let response;

    try {
      response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${image}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.4,
          max_completion_tokens: 1200,
        }),
      });
    } catch (error) {
      if (error.name === "TimeoutError") {
        return jsonError(
          "The AI service took too long to respond. Please try again.",
          504
        );
      }

      console.error("Groq connection failed:", error.name);

      return jsonError(
        "Unable to connect to the AI service. Please try again later.",
        502
      );
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error(
          "Groq authentication failed. Check the server-side API key."
        );

        return jsonError(
          "AI authentication failed. Please verify the Groq API key in the server environment settings.",
          502
        );
      }

      if (response.status === 429) {
        return jsonError(
          "The AI service is temporarily rate-limited. Please wait and try again.",
          429
        );
      }

      if (response.status >= 500) {
        return jsonError(
          "The AI service is temporarily unavailable. Please try again.",
          502
        );
      }

      console.error("Groq rejected the request:", response.status);

      return jsonError(
        "The AI service rejected the request. Check the model configuration and try again.",
        502
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      return jsonError(
        "The AI service returned an invalid response.",
        502
      );
    }

    const text = data?.choices?.[0]?.message?.content;

    if (typeof text !== "string" || !text.trim()) {
      return jsonError(
        "The AI returned an empty listing. Please try again.",
        502
      );
    }

    return NextResponse.json(
      {
        text: text.trim(),
        demoMode: false,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("ArtisanAI server error:", error.name);

    return jsonError(
      "An unexpected error occurred. Please try again.",
      500
    );
  }
}
