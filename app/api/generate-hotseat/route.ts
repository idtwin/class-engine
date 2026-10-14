import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, mistralModel, topic, level, showTranslations, seed, exclude } = await req.json();

    const translationInstruction = showTranslations 
      ? `Provide an Indonesian translation in parenthesis for the main "word" and each "forbidden" word. Example: "ELEPHANT (Gajah)".` 
      : `Return the words in English ONLY.`;

    const exclusionList = (exclude && exclude.length > 0) 
      ? `STRICT EXCLUSION: Do NOT use any of these words: ${exclude.join(", ")}.`
      : "";

    const systemPrompt = `You are a fun, high-energy ESL game show host. Generate a list of 10 Password/Taboo words for a speaking game.
Topic: ${topic}
Target Class Level: ${level}

Return ONLY raw JSON in this exact structure:
{
  "words": [
    {
      "word": "ELEPHANT (Gajah)",
      "forbidden": ["TRUNK (Belalai)", "ANIMAL (Binatang)", "BIG (Besar)"]
    }
  ]
}

Rules:
1. Provide exactly 10 words.
2. Provide exactly 3 forbidden words.
3. ${translationInstruction}
4. ${exclusionList}
5. FORCED VARIETY & BRANCHING:
   - Do NOT just pick the most obvious words.
   - Pick a specific "sub-genre" or "vibe" of the topic at random.
   - Use the seed [${seed}] to ensure this set is unique.
6. PEDAGOGICAL BALANCING:
   - A1-A2 (Beginner): Top 1,000 words. Simple, touchable objects.
   - B1-B2 (Intermediate): Words 1,001-3,000. Concepts, feelings.
   - C1-C2 (Advanced): Advanced vocabulary for FLUENT CONVERSATION. AVOID obscure science/academic jargon.
   - ABSOLUTELY NO: "Molecular Gastronomy", "Gelatinization", or highly technical terms.
7. Return ONLY pure raw JSON. No markdown.`;

    const userPrompt = `Topic: ${topic}\nLevel: ${level}\nSeed: ${seed}\nGenerate JSON now!`;

    const parsed: any = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.8, mistralModel, provider });

    // Normalize: auto-unwrap may return array directly or {words:[...]}
    const words = Array.isArray(parsed) ? parsed : (parsed.words || parsed);
    return NextResponse.json({ words });
  } catch (error: any) {
    console.error("HotSeat Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
