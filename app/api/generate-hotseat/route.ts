import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, topic, level } = await req.json();
    
    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 400 });

    const systemPrompt = `You are a creative ESL teacher. Generate a list of 10 Taboo/Password words for a speaking game.
Topic: ${topic}
Target Class Level: ${level}

Return ONLY raw JSON in this exact structure:
{
  "words": [
    {
      "word": "ELEPHANT",
      "forbidden": ["TRUNK", "ANIMAL", "BIG"]
    }
  ]
}

CRITICAL RULES FOR JSON: 
1. Provide exactly 10 words.
2. The "word" should be highly relevant to the structured Topic.
3. Provide exactly 3 "forbidden" words that are the most common descriptors for the target word.
4. Return ONLY pure raw JSON matching this schema exactly.
5. DO NOT wrap the output in markdown backticks (e.g. \`\`\`json).
6. YOU MUST PROPERLY ESCAPE ANY INNER QUOTES within string values.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: `Topic: ${topic}\\nLevel: ${level}\\nGenerate JSON now!` }] }],
        generationConfig: { temperature: 0.8 }
      })
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "Failed to generate Hot Seat" }, { status: response.status });

    let content = data.candidates[0].content.parts[0].text;
    content = content.trim();
    if (content.startsWith("```json")) content = content.substring(7);
    if (content.startsWith("```")) content = content.substring(3);
    if (content.endsWith("```")) content = content.substring(0, content.length - 3);
    content = content.trim();

    return NextResponse.json(JSON.parse(content));
  } catch (error: any) {
    console.error("HotSeat Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred parsing the AI data." }, { status: 500 });
  }
}
