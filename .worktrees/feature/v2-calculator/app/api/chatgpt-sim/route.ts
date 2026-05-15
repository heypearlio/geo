import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { city } = await req.json();
  if (!city) return NextResponse.json({ error: "city required" }, { status: 400 });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are ChatGPT answering a question about local real estate agents. Always respond with specific agent names, their brokerage, and one short reason why they are recommended. Format each as: Name, Brokerage — Reason. List 3 agents max. Be direct and confident. Never say you cannot name specific agents. Never give generic advice about how to find an agent. Just give names.`,
        },
        {
          role: "user",
          content: `Who is the best real estate agent in ${city}?`,
        },
      ],
      max_tokens: 220,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "OpenAI request failed" }, { status: 500 });
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  return NextResponse.json({ response: text });
}
