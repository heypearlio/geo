import Anthropic from "@anthropic-ai/sdk";
import { emailWrapper, btn, sig, h1, p } from "./emails/base";
import { supabase } from "./resend";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface AuditEmailParams {
  firstName: string;
  email: string;
  city: string;
  auditNumber: number;
  overall: number;
  seo: number;
  ai: number;
  previousOverall?: number;
  auditId?: string;
  website?: string;
  previousWebsite?: string;
}

// --- Dimension classifiers ---

function scoreTier(overall: number): "high" | "mid" | "low" {
  if (overall >= 70) return "high";
  if (overall >= 40) return "mid";
  return "low";
}

function scoreDirection(
  auditNumber: number,
  overall: number,
  previousOverall?: number
): "first" | "improvement" | "drop" | "same" {
  if (auditNumber === 1) return "first";
  if (previousOverall === undefined) return "same";
  if (overall > previousOverall) return "improvement";
  if (overall < previousOverall) return "drop";
  return "same";
}

// --- Template hydration ---

function hydrate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}

function buildValues(
  params: AuditEmailParams & { reportLink: string; scheduleLink: string }
): Record<string, string> {
  const pointChange =
    params.previousOverall !== undefined
      ? String(Math.abs(params.overall - params.previousOverall))
      : "0";

  const websiteChanged =
    !!params.website &&
    !!params.previousWebsite &&
    params.website.replace(/^https?:\/\//, "").replace(/\/$/, "") !==
      params.previousWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const websiteChangedNote = websiteChanged
    ? `<p style="margin:0 0 20px;color:#4A5E7A;">I also noticed you submitted a different site this time (${params.website}). I'll factor that in when we talk.</p>`
    : "";

  return {
    firstName: params.firstName,
    city: params.city,
    overall: String(params.overall),
    seo: String(params.seo),
    ai: String(params.ai),
    previousOverall: String(params.previousOverall ?? ""),
    pointChange,
    website: params.website ?? "",
    previousWebsite: params.previousWebsite ?? "",
    websiteChangedNote,
    reportLink: params.reportLink,
    scheduleLink: params.scheduleLink,
  };
}

// --- Draft structure ---

interface EmailDraft {
  headline: string;
  paragraphs: string[];
  post_cta_note?: string;
  subject_a: string;
  subject_b: string;
}

// --- Generation with Claude Sonnet 4.6 ---
// Sonnet handles email copy quality at ~3x less cost than Opus.
// Humanizer merged into the same call — one round trip instead of two.
// No adaptive thinking — a focused prompt is equally effective for short copy.

async function generateDraft(
  tier: "high" | "mid" | "low",
  direction: "first" | "improvement" | "drop" | "same",
  auditNumber: number
): Promise<EmailDraft> {
  const auditCtx =
    auditNumber === 1
      ? "their first audit — they are brand new"
      : auditNumber === 2
      ? "their second audit — they came back to check again"
      : "their third or more audit — they keep running the score but have not booked a call yet";

  const tierDesc =
    tier === "high"
      ? "70+ — they are ahead of most agents in their market right now"
      : tier === "mid"
      ? "40-69 — middle of the pack, there is a real gap to close"
      : "below 40 — most competitors in their market are in the same spot";

  const directionDesc =
    direction === "first"
      ? "No comparison — this is their very first score"
      : direction === "improvement"
      ? "Score improved since last time — celebrate it, make it feel earned"
      : direction === "drop"
      ? "Score dropped since last time — acknowledge it honestly, frame as competitors gaining ground"
      : "Score unchanged since last time — name what actually needs to move to change it";

  const prompt = `You are writing email templates for Misti Bruton at GEO by HeyPearl, an AI visibility scoring service for real estate agents.

THE GOAL: get the lead to book a free 30-minute strategy call. That is the only next step. Every word exists to overcome their objection to booking.

FUNNEL CONTEXT — hardcoded, never deviate:
1. The lead ran a free AI Visibility Score audit.
2. They saw their score live on the score page. They already know their number.
3. This email lands in their inbox. The ONLY next step is booking the call.
4. Do NOT mention viewing the report — they already saw it.

BEHAVIORAL TRIGGER FOR THIS TEMPLATE:
- Audit situation: ${auditCtx}
- Score tier: ${tierDesc}
- Score direction: ${directionDesc}

VOICE — study these real emails from this sequence and match the tone exactly:

Example 1 (lead_nurture_2):
Subject: "{{firstName}}, this is the part most agents miss"
Headline: "This Is the Part Most Agents Miss"
Body: "You ran your AI Visibility Score. Most agents look at it, nod, and move on.
But here's what the report doesn't say out loud:
We've already seen agents in {{city}} start optimizing for AI visibility. The question is whether you'll be the one AI recommends, or someone else.
We checked — your market is still open. But we can only work with one agent per city. Once someone else claims it, it's gone."
CTA: "See If My Market Is Available"
Post-CTA: "No pitch. No pressure. Just a 30-minute call to walk through your report together."

Example 2 (lead_nurture_3):
Subject: "Quick question about {{city}}"
Headline: "One Agent Per Market. That's the Rule."
Body: "{{firstName}}, I want to be straight with you.
GEO is not a course. It's not a membership. It's a done-for-you AI visibility system that makes you the agent AI recommends in your market — and that only works if we're running it for one agent per city.
Right now, your market is available. That could change today.
Every week, agents across the country are claiming their markets. Once one agent in your city books a strategy call and moves forward, your spot disappears. Not temporarily. Permanently."
CTA: "Check My Market"

Example 3 (lead_nurture_6):
Subject: "Last thing on {{city}}"
Headline: "I Have One Question For You"
Body: "{{firstName}}, I'll keep this short.
What would it mean for your business if buyers in your city started seeing your name every time they asked ChatGPT, Perplexity, or Google AI who to call for real estate?
That's not a hypothetical. That's what GEO does. And it's working right now for agents in markets just like yours."
CTA: "One Agent Per Market — Check Yours"
Post-CTA: "Whatever you decide, I'm rooting for you."

KEY VOICE RULES from these examples:
- Short paragraphs. Often just 1-3 sentences. Never long blocks.
- Name the exclusivity: "one agent per market", "your market is still open", "once someone claims it, it's gone"
- Create urgency around someone else claiming the market — not around a sale
- Warm but direct. Never corporate. Never salesy.
- Short punchy CTAs that feel natural: "Check My Market", "See If My Market Is Available"
- It's ok to add one short line AFTER the button for warmth

FIRST — reason through:
What is this person's emotional state right now given their situation (${auditCtx}, ${tierDesc}, ${directionDesc})? What objection is keeping them from booking? What is the single most powerful thing to say that breaks it, in the voice above?

PLACEHOLDER TOKENS — use exactly as written:
- {{firstName}} — contact's first name
- {{city}} — their city
- {{overall}} — current AI Visibility Score
- {{seo}} — SEO component score
- {{ai}} — AI component score
- {{previousOverall}} — previous score (skip for audit 1 templates)
- {{pointChange}} — absolute point change, always positive
- {{websiteChangedNote}} — sentence if they submitted a different website, empty if not. Include once in audit 2+ only.
- {{scheduleLink}} — booking link (already in the button — do not add a raw URL anywhere)

FORMAT — match the examples above exactly:
- Headline: 6-10 words, punchy, use {{placeholders}} where natural
- Paragraphs: 2-4 total, 150 words max combined, short sentences
- Optional post_cta_note: one short warm line after the button (like the examples above)
- Subject A: direct and specific
- Subject B: curiosity or urgency angle

SELF-REVIEW before returning — reject your draft if it contains:
- Em dashes
- "I hope", "just checking in", "wanted to reach out", "touch base", "leverage", "game-changer", "dive in", "at the end of the day", "moving the needle"
- Passive voice when active works
- Any sentence over 20 words
- Any un-replaced {{placeholder}} in subject lines
If you catch any of these, rewrite that line before returning.

Return JSON only, no markdown fences:
{
  "headline": "headline text",
  "paragraphs": ["para 1", "para 2", "optional para 3"],
  "post_cta_note": "optional short warm line, or empty string",
  "subject_a": "direct subject line",
  "subject_b": "curiosity or urgency subject line"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in Claude response");
  }

  // Extract JSON from response — handles reasoning text before/after the JSON object
  const start = textBlock.text.indexOf("{");
  const end = textBlock.text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in Claude response");
  }
  const raw = textBlock.text.slice(start, end + 1);
  return JSON.parse(raw) as EmailDraft;
}

// --- Template assembly ---
// Builds the body template string using standard helpers (h1, p, btn, sig).
// {{websiteChangedNote}} is left as a token — hydrated at send time.

function assembleTemplate(
  draft: Pick<EmailDraft, "headline" | "paragraphs" | "post_cta_note">,
  ctaLabel: string,
  scheduleLink: string
): string {
  return `
    ${h1(draft.headline)}
    ${draft.paragraphs.map((text) => p(text)).join("")}
    {{websiteChangedNote}}
    ${btn(ctaLabel, scheduleLink)}
    ${draft.post_cta_note ? p(draft.post_cta_note) : ""}
    ${sig()}
  `;
}

// --- Main entry point ---

export async function generateAuditEmail(
  params: AuditEmailParams
): Promise<{ subject: string; html: string; abVariant: "a" | "b" }> {
  const { firstName, email, city, auditNumber, overall, seo, ai, previousOverall, auditId } =
    params;

  const reportLink = auditId
    ? `https://geo.heypearl.io/report?auditId=${auditId}&email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(firstName)}&overall=${overall}&seo=${seo}&ai=${ai}`
    : `https://geo.heypearl.io/audit`;
  const scheduleLink = "https://geo.heypearl.io/schedule";

  const tier = scoreTier(overall);
  const direction = scoreDirection(auditNumber, overall, previousOverall);
  const templateAuditNumber = Math.min(auditNumber, 3);

  // --- Check template cache ---
  const { data: existing } = await supabase
    .from("geo_audit_email_templates")
    .select("id, subject_template, subject_template_b, body_template")
    .eq("audit_number", templateAuditNumber)
    .eq("score_tier", tier)
    .eq("score_direction", direction)
    .single();

  let subjectTemplateA: string;
  let subjectTemplateB: string | null;
  let bodyTemplate: string;

  if (existing) {
    // Cache hit — no AI calls needed
    subjectTemplateA = existing.subject_template;
    subjectTemplateB = existing.subject_template_b ?? null;
    bodyTemplate = existing.body_template;
  } else {
    // Cache miss — generate via Claude, then humanize, then save
    const ctaLabel =
      templateAuditNumber === 1 ? "Book My Free Strategy Call" : "Book My Strategy Call";

    const draft = await generateDraft(tier, direction, templateAuditNumber);

    bodyTemplate = assembleTemplate(draft, ctaLabel, scheduleLink);
    subjectTemplateA = draft.subject_a;
    subjectTemplateB = draft.subject_b;

    // Save for reuse — upsert in case of concurrent request
    await supabase.from("geo_audit_email_templates").upsert(
      {
        audit_number: templateAuditNumber,
        score_tier: tier,
        score_direction: direction,
        subject_template: subjectTemplateA,
        subject_template_b: subjectTemplateB,
        body_template: bodyTemplate,
      },
      { onConflict: "audit_number,score_tier,score_direction" }
    );
  }

  // --- A/B subject selection ---
  // Randomly pick A or B. Track which was sent via abVariant in queue metadata.
  const abVariant: "a" | "b" =
    subjectTemplateB && Math.random() < 0.5 ? "b" : "a";
  const chosenSubjectTemplate =
    abVariant === "b" && subjectTemplateB ? subjectTemplateB : subjectTemplateA;

  // Record send against the right variant counter (fire-and-forget)
  if (existing?.id) {
    supabase.rpc("record_template_send", { template_id: existing.id, variant: abVariant }).then(() => {});
  }

  // --- Hydrate placeholders ---
  const values = buildValues({ ...params, reportLink, scheduleLink });
  const subject = hydrate(chosenSubjectTemplate, values);
  const bodyHydrated = hydrate(bodyTemplate, values);

  const html = emailWrapper(bodyHydrated, "warm_nurture");
  return { subject, html, abVariant };
}
