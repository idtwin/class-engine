import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, topic, level } = await req.json();
    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 400 });

    const systemPrompt = `You are a creative ESL teacher running an improv "Story Chain" game.
Topic: ${topic}
Level: ${level}

Return ONLY raw JSON in this exact structure:
{
  "starter": "A wild, mysterious, or funny opening sentence perfectly related to the Topic to start a story.",
  "rounds": [
    { "words": ["Noun1", "Noun2", "Noun3"] },
    { "words": ["Noun4", "Noun5", "Noun6"] }
  ]
}

CRITICAL RULES FOR JSON: 
1. Provide exactly 15 rounds of words.
2. The "starter" sentence should be crazy and engaging (e.g. "Suddenly, the teacher turned into a...").
3. Each round must contain exactly 3 totally unrelated, highly visual nouns (e.g. "Banana", "Spacecraft", "Dinosaur").
4. Return ONLY pure raw JSON matching this schema exactly.
5. DO NOT wrap the output in markdown backticks.
6. YOU MUST PROPERLY ESCAPE ANY INNER QUOTES.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: `Topic: ${topic}\nLevel: ${level}\nGenerate JSON now!` }] }],
        generationConfig: { temperature: 0.9 }
      })
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "Failed to generate Story Chain" }, { status: response.status });

    let content = data.candidates[0].content.parts[0].text.trim();
    if (content.startsWith("```json")) content = content.substring(7);
    if (content.startsWith("```")) content = content.substring(3);
    if (content.endsWith("```")) content = content.substring(0, content.length - 3);

    return NextResponse.json(JSON.parse(content.trim()));
  } catch (error: any) {
    console.error("Story Gen Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred." }, { status: 500 });
  }
}
