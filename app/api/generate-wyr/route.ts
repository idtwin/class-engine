import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, topic, level } = await req.json();
    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 400 });

    const systemPrompt = `You are a creative ESL teacher. Generate a list of 10 "Would You Rather" style debate prompts.
Topic: ${topic}
Level: ${level}

Return ONLY raw JSON in this exact structure:
{
  "prompts": [
    {
      "optionA": "Short description of choice A",
      "optionB": "Short description of choice B"
    }
  ]
}

CRITICAL RULES FOR JSON: 
1. Provide exactly 10 debate scenarios.
2. The choices should be bizarre, funny, or difficult decisions perfectly matched to the user's Topic.
3. Keep the text for options extremely concise (1-2 sentences maximum).
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
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "Failed to generate WYR" }, { status: response.status });

    let content = data.candidates[0].content.parts[0].text.trim();
    if (content.startsWith("```json")) content = content.substring(7);
    if (content.startsWith("```")) content = content.substring(3);
    if (content.endsWith("```")) content = content.substring(0, content.length - 3);

    return NextResponse.json(JSON.parse(content.trim()));
  } catch (error: any) {
    console.error("WYR Gen Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred." }, { status: 500 });
  }
}
