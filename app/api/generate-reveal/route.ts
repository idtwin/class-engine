import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, ollamaModel, topic, level } = await req.json();

    const systemPrompt = `You are a creative ESL teacher. Generate a 16-question set and a hidden image prompt for a Picture Reveal game.
Topic: ${topic}
Class Level: ${level}

Return ONLY raw JSON in this exact structure:
{
  "imageAnswer": "The precise short answer that players must guess (e.g., 'Eiffel Tower')",
  "imagePrompt": "A highly detailed description that MUST explicitly contain the imageAnswer subject name (e.g. 'The Eiffel Tower at sunset with golden light')",
  "questions": [
    { "q": "Short question text here", "a": "Short answer here" }
  ]
}

Rules:
1. Provide exactly 16 questions.
2. Questions must be very short, rapid-fire (grammar, vocabulary, or trivia) based on the topic.
3. The imagePrompt MUST explicitly include the actual name of the subject (the imageAnswer).
4. Select a completely random and unexpected specific subject related to the topic. Do NOT just pick the most obvious example.
5. Return ONLY pure raw JSON. No markdown.`;

    const userPrompt = `Topic: ${topic}\nLevel: ${level}\nRandom entropy: ${Math.random()}\nGenerate JSON now!`;

    const parsed: any = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.95, ollamaModel, provider });

    // Reveal has multi-key response {imageAnswer, imagePrompt, questions} — won't be auto-unwrapped
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Reveal Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
