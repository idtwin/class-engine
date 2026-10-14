import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, mistralModel, topic, count = 10 } = await req.json();

    const systemPrompt = `You are an expert English language teacher creating a fast-paced warm-up category game called "Category Sprint" for high school students.
Generate a JSON array of ${count} category prompt objects.

Each object MUST match this JSON structure:
{
  "id": "cat-1",
  "category": "Animals",
  "count": 3,
  "difficulty": "Easy",
  "sampleAnswers": ["Dog", "Cat", "Elephant"]
}

Rules:
1. "count" MUST be an integer between 3 and 5.
2. "difficulty" MUST be one of: "Easy", "Medium", or "Hard".
   - Easy: 3 items, basic everyday vocabulary (e.g. 3 Animals, 3 Colors, 3 Fruits)
   - Medium: 3-4 items, intermediate vocabulary or concepts (e.g. 3 Oceans, 4 Past Tense Verbs, 4 Household Appliances)
   - Hard: 4-5 items, challenging or specific topics (e.g. 5 Cities in Europe, 4 Irregular Past Participles, 4 Countries in South America)
3. "sampleAnswers" MUST be an array of ${"count"} valid example answers matching the category.
4. Output ONLY valid JSON array without extra prose or markdown wrappers.`;

    const userPrompt = topic && topic.trim()
      ? `Generate ${count} category sprint items focused on the lesson topic: "${topic}".`
      : `Generate ${count} diverse, engaging classroom category sprint items covering general vocabulary, geography, grammar, and popular culture.`;

    const parsed = await generateJSON(apiKey, {
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      mistralModel,
      provider,
    });

    return NextResponse.json({ categories: parsed });
  } catch (error: any) {
    console.error("Error generating category sprint items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate categories" },
      { status: 500 }
    );
  }
}
