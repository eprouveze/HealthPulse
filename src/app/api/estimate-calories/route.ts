import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { foodItem, apiKey } = await request.json();

    if (!foodItem) {
      return NextResponse.json({ error: "foodItem is required" }, { status: 400 });
    }

    // Get API key from request or database
    let key = apiKey;
    if (!key) {
      const setting = await db.all(
        sql`SELECT value FROM settings WHERE key = 'anthropic_api_key'`
      ) as Array<{ value: string }>;
      key = setting[0]?.value;
    }

    if (!key) {
      return NextResponse.json(
        { error: "API key not configured. Set it in Settings." },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey: key });

    const prompt = `Estimate the calories and protein for this food item. Respond ONLY with a JSON object in this exact format, no other text:
{
  "calories": <number>,
  "protein_g": <number>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "<brief explanation>"
}

Food item: ${foodItem}

Important:
- Be realistic and use standard portion sizes unless specified
- For Japanese foods, use typical Japanese portions
- Round to nearest whole number
- If the portion is unclear, assume a standard single serving
- If the user mentions a brand or specific product, use known nutritional data if available`;

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
    }

    // Extract JSON from response (handle potential markdown formatting)
    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```\n?$/g, "").trim();
    }

    const estimate = JSON.parse(jsonText);

    return NextResponse.json({
      calories: Math.round(estimate.calories),
      proteinG: Math.round(estimate.protein_g),
      confidence: estimate.confidence,
      reasoning: estimate.reasoning,
    });
  } catch (error) {
    console.error("Calorie estimation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
