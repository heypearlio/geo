import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "sk-build-placeholder" });

export async function POST(req: NextRequest) {
  const { lead } = await req.json();
  if (!lead?.email) return NextResponse.json({ error: "Missing lead" }, { status: 400 });

  const behaviors = [
    lead.booked && "booked a strategy call",
    lead.watched_video && "watched the video",
    lead.hit_schedule && "visited the booking page but didn't book",
    lead.had_call && "had a sales call",
    lead.no_showed && "no-showed a call",
    lead.is_podcast_guest && "is a podcast guest",
    lead.total_opens > 0 && `opened ${lead.total_opens} email${lead.total_opens > 1 ? "s" : ""}`,
    lead.total_clicks > 0 && `clicked ${lead.total_clicks} time${lead.total_clicks > 1 ? "s" : ""}`,
  ].filter(Boolean).join(", ");

  const prompt = `You are a sales coach. A real estate agent named ${lead.first_name ?? lead.email} has a lead score of ${lead.score}/100 (tier: ${lead.tier}).

Their recent behavior: ${behaviors || "minimal engagement"}.

Write ONE punchy sentence (max 20 words) telling me exactly why to reach out right now and what angle to use. Be specific, not generic. No fluff.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 60,
      messages: [{ role: "user", content: prompt }],
    });
    const insight = response.choices[0].message.content?.trim() ?? "";
    return NextResponse.json({ insight });
  } catch {
    return NextResponse.json({ insight: "High engagement — follow up now while they're warm." });
  }
}
