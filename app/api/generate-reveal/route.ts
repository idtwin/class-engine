import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey, topic, level } = await req.json();
    
    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 400 });

    const systemPrompt = `You are a creative ESL teacher. Generate a 16-question set and a hidden image prompt for a Picture Reveal game.
Topic: ${topic}
Class Level: ${level}

Return ONLY raw JSON in this exact structure:
{
  "imageAnswer": "The precise short answer that players must guess (e.g., 'Eiffel Tower')",
  "imagePrompt": "A highly detailed description. It MUST explicitly contain the imageAnswer subject name (e.g. 'The Eiffel Tower at sunset')",
  "questions": [
    { "q": "Short question text here", "a": "Short answer here" }
  ]
}

CRITICAL RULES FOR JSON: 
1. Provide exactly 16 questions.
2. Questions must be very short, rapid-fire (e.g. grammar, vocabulary, or trivia) based on the topic.
3. The imagePrompt MUST explicitly include the actual name of the subject (the imageAnswer) so the image AI knows exactly what to draw. Do not be vague.
4. Return ONLY pure raw JSON matching this schema exactly.
5. DO NOT wrap the output in markdown backticks.
6. YOU MUST PROPERLY ESCAPE ANY INNER QUOTES within string values.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: `Topic: ${topic}\nLevel: ${level}\nCRITICAL INSTRUCTION: You must select a completely random, unexpected, and specific subject related to the topic. Do NOT just pick the most common or obvious example. (Random Entropy: ${Math.random()})\nGenerate JSON now!` }] }],
        generationConfig: { temperature: 0.95 }
      })
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "Failed to generate Reveal game" }, { status: response.status });

    let content = data.candidates[0].content.parts[0].text;
    content = content.trim();
    if (content.startsWith("```json")) content = content.substring(7);
    if (content.startsWith("```")) content = content.substring(3);
    if (content.endsWith("```")) content = content.substring(0, content.length - 3);
    content = content.trim();

    return NextResponse.json(JSON.parse(content));
  } catch (error: any) {
    console.error("Reveal Gen Error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred parsing the AI data." }, { status: 500 });
  }
}
