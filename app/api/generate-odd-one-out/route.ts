import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, topic, level } = await req.json();
    
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    let levelPrompt = `Generate EXACTLY 12 questions/sets matching the ${level} difficulty level.`;
    if (level === "Mixed Level") levelPrompt = `Generate EXACTLY 12 questions/sets. Generate 4 Low difficulty, 4 Mid difficulty, and 4 High difficulty sets.`;

    const systemPrompt = `You are a creative ESL teacher designing an 'Odd One Out' vocabulary game.
    
Based on the topic, ${levelPrompt}
Each set contains exactly 4 words where 3 belong to a pattern and 1 is the odd one out.

The JSON MUST be exactly an array of 12 objects matching this schema:
[
  {
    "level": "Low" | "Mid" | "High",
    "words": ["Word1", "Word2", "Word3", "Word4"],
    "answer": "The target isolated word that is the odd one out",
    "hint": "A helpful clue for the class to figure out the correlation of the 3 similar words, e.g. 'Three of these are fruits.'"
  }
]

Requirements:
- Make sure the "words" array has EXACTLY 4 strings.
- The "answer" must perfectly match one of the items in the "words" array.
- Output only valid internal JSON.
- CRITICAL: Return ONLY pure raw JSON starting with [ and ending with ]. DO NOT wrap in markdown \`\`\`json blocks.
- CRITICAL: PROPERLY ESCAPE ANY INNER QUOTES.`;

    const userPrompt = `Topic: ${topic}

Generate the 12 sets now!`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: "user",
          parts: [{ text: userPrompt }]
        }],
        generationConfig: {
          temperature: 0.9
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        return NextResponse.json({ error: data.error?.message || "Failed to generate game via Gemini" }, { status: response.status });
    }

    let content = data.candidates[0].content.parts[0].text;
    
    // Strip accidental markdown blocks
    content = content.trim();
    if (content.startsWith("```json")) content = content.substring(7);
    if (content.startsWith("```")) content = content.substring(3);
    if (content.endsWith("```")) content = content.substring(0, content.length - 3);
    content = content.trim();

    const parsed = JSON.parse(content);

    return NextResponse.json({ questions: parsed });

  } catch (error: any) {
    console.error("Odd One Out Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred parsing the AI data." }, { status: 500 });
  }
}
