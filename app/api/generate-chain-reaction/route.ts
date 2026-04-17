import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, mistralModel, topic, level, mode, count, circleCount } = await req.json();
    const finalCount = count || 5;

    if (mode === "word-reveal") {
      const systemPrompt = `You are an ESL game designer. Generate 5-7 English vocabulary words for an Indonesian high school classroom game. Words should be thematically connected to the given topic and appropriate for the difficulty level. Rules: single words only (no phrases), 4-9 letters each, all uppercase, varied lengths, appropriate vocabulary for the level. Level guide: Low (A1)=very simple words, High (B1)=more complex. Return JSON: { "words": ["WORD1", "WORD2", ...] }`;
      const userPrompt = `Topic: ${topic}, Level: ${level}`;
      const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.8, mistralModel, provider });
      const words = Array.isArray(parsed) ? parsed : (parsed as any).words || [];
      return NextResponse.json({ words });
    }

    if (mode === "speed") {
      const systemPrompt = `You are an ESL vocabulary game designer creating a "Speed Chain" word game.

Generate ${finalCount} category-based word lists for the topic. Each category should have 30+ valid English words.
These words will be used in a last-letter chain game (the next word must start with the last letter of the previous word).

CRITICAL:
1. Provide a broad variety of words starting with MANY different letters so the game doesn't get stuck.
2. All words must be strictly relevant to the category.
3. Include plurals and common variations where appropriate.

Difficulty: ${level}
- Beginner: Very simple, common words (animals, food, colors). Suitable for A1-A2 students.
- Intermediate: B1-B2 level vocabulary. Common but varied words.
- Advanced: C1-C1+ level vocabulary, fluent-level words.

Return valid JSON — an object with a "categories" array:
{
  "categories": [
    {
      "name": "Category Name",
      "startWord": "A good starting word from this category",
      "validWords": ["word1", "word2", "word3", ...],
      "difficulty": "${level}"
    }
  ]
}

All words must be lowercase. No markdown.`;

      const userPrompt = `Topic: ${topic}\n\nGenerate ${finalCount} categories with 30+ words each! Ensure high vocabulary variety.`;
      const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, mistralModel, provider });

      if (Array.isArray(parsed)) {
        return NextResponse.json({ categories: parsed });
      }
      return NextResponse.json(parsed);
    }

    // Default: Chain Puzzle (compound word chains — backwards compat)
    let difficultyGuide = "";

    if (level === "Beginner") {
      difficultyGuide = `Use ONLY basic compound words and very common two-word phrases that A1-A2 (Beginner) ESL students know.
      Examples: sunshine, bedroom, football, ice cream, hot dog, toothbrush, rainbow, popcorn, starfish, goldfish.`;
    } else if (level === "Intermediate") {
      difficultyGuide = `Use common compound words and phrasal chunks for B1-B2 (Intermediate) students.
      Examples: doorstep, notebook, waterfall, downtown, background, headline, eyelid, light year, traffic jam.`;
    } else {
      difficultyGuide = `Use sophisticated compound words and complex phrases for Fluent/Advanced (C1-C2) speakers.
      Examples: undercurrent, watershed, turncoat, thunderstruck, fingerprint, brainwash, bottleneck, hearsay.`;
    }

    const isRandom = circleCount === "random";
    const wordCountRule = isRandom
      ? `choose a DIFFERENT number of words (between 4 and 7) for EACH of the ${finalCount} chains independently. Diversity in length is required.`
      : `EVERY chain in the "chains" array must have EXACTLY ${circleCount || 5} words in its "words" array. No exceptions.`;

    const systemPrompt = `You are creating a "Chain Reaction" word puzzle game for ESL students.

Generate EXACTLY ${finalCount} word chains where EVERY adjacent pair of words forms a real English compound word or common two-word phrase.

${difficultyGuide}

CRITICAL RULES:
1. WORD COUNT: For this generation, you must ${wordCountRule}
2. ADJACENT PAIRS: Every adjacent pair MUST form a real compound word or common phrase (e.g., SUN+LIGHT=sunlight, ICE+CREAM=ice cream).
3. CASE: All words in the "words" array must be UPPERCASE.
4. JSON STRUCTURE: Return an object with a "chains" array.
{
  "chains": [
    {
      "words": ["SUN", "LIGHT", "HOUSE", "WORK"],
      "connections": ["sunlight", "lighthouse", "housework"],
      "difficulty": "${level}"
    }
  ]
}

The "connections" field shows what compound word/phrase each adjacent pair makes. No markdown.`;

    const userPrompt = `Topic: ${topic}\n\nGenerate ${finalCount} compound word chains now! Ensure they are exactly the requested length.`;
    const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.8, mistralModel, provider });

    if (Array.isArray(parsed)) {
      return NextResponse.json({ chains: parsed });
    }
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Chain Reaction Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
