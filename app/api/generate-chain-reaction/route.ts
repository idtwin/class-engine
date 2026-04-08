import { NextResponse } from "next/server";
import { generateJSON } from "../../lib/llm";

export async function POST(req: Request) {
  try {
    const { apiKey, provider, ollamaModel, topic, level, mode } = await req.json();

    if (mode === "speed") {
      // Speed Chain: generate categories with valid word lists
      const systemPrompt = `You are an ESL vocabulary game designer creating a "Speed Chain" word game.

Generate 5 category-based word lists for the topic. Each category should have 25+ valid English words.
These words will be used in a last-letter chain game (the next word must start with the last letter of the previous word).

Difficulty: ${level}
- Low: Very simple, common words (animals, food, colors). Suitable for A1 elementary students.
- Mid: Intermediate vocabulary. Common but varied words.
- High: Advanced vocabulary, less common words.

Return valid JSON — an object with a "categories" array:
{
  "categories": [
    {
      "name": "Category Name",
      "startWord": "A good starting word from this category",
      "validWords": ["word1", "word2", "word3", ...],
      "difficulty": "Low"
    }
  ]
}

All words must be lowercase. No markdown.`;

      const userPrompt = `Topic: ${topic}\n\nGenerate 5 categories with 25+ words each!`;
      const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.9, ollamaModel, provider });
      
      // Handle both array and object responses
      if (Array.isArray(parsed)) {
        return NextResponse.json({ categories: parsed });
      }
      return NextResponse.json(parsed);
    }

    // Chain Puzzle: generate compound word chains
    let chainCount = 5;
    let chainLength = "4-5";
    let difficultyGuide = "";

    if (level === "Low") {
      chainCount = 4;
      chainLength = "3-4";
      difficultyGuide = `Use VERY common compound words and two-word phrases that A1/elementary ESL students would know.
Examples: sunshine, bedroom, football, ice cream, hot dog, toothbrush, rainbow, popcorn, starfish.
Two-word phrases are encouraged: ice cream, cream cheese, cheese cake.`;
    } else if (level === "Mid") {
      chainCount = 5;
      chainLength = "4-5";
      difficultyGuide = `Use common compound words and phrases suitable for intermediate students.
Examples: doorstep, notebook, waterfall, downtown, background, headline, eyelid.
Two-word phrases work too: traffic light, light year, year book.`;
    } else {
      chainCount = 6;
      chainLength = "5-7";
      difficultyGuide = `Use challenging compound words and phrases for advanced students.
Examples: watershed, turncoat, undercurrent, thunderstruck, fingerprint, brainwash.
Complex chains are great: black board, board room, room mate, mate ship.`;
    }

    const systemPrompt = `You are creating a "Chain Reaction" word puzzle game for ESL students.

Generate EXACTLY ${chainCount} word chains where EVERY adjacent pair of words forms a real English compound word or common two-word phrase.

${difficultyGuide}

Each chain must be ${chainLength} words long.

CRITICAL RULES:
1. Every adjacent pair MUST form a real compound word or common phrase (e.g., SUN+LIGHT=sunlight, ICE+CREAM=ice cream)
2. Words should be single words (the compound is formed by combining adjacent words)
3. Double-check every connection is a real compound word or phrase
4. All words must be UPPERCASE

Return valid JSON — an object with a "chains" array:
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

    const userPrompt = `Topic: ${topic}\n\nGenerate ${chainCount} compound word chains now!`;
    const parsed = await generateJSON(apiKey, { systemPrompt, userPrompt, temperature: 0.8, ollamaModel, provider });

    if (Array.isArray(parsed)) {
      return NextResponse.json({ chains: parsed });
    }
    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Chain Reaction Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
