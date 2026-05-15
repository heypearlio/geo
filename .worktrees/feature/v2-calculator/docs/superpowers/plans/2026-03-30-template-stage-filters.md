# Template Stage Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cold/Warm/Hot/Podcast/Client filter pills to the Templates tab so sequences can be browsed by funnel stage.

**Architecture:** Add a `stage` field to every sequence entry in `lib/sequences.ts` alongside a `STAGE_META` export. The `TemplatesTab` component in `LeadsHub.tsx` reads `STAGE_META` to render filter pills and filters `SEQUENCES` by the active stage before rendering the sidebar list.

**Tech Stack:** Next.js 16.2, TypeScript, React inline styles (no Tailwind in this file)

---

### Task 1: Add `stage` field and `STAGE_META` to `lib/sequences.ts`

**Files:**
- Modify: `lib/sequences.ts`

- [ ] **Step 1: Add `STAGE_META` constant and `stage` field to every sequence**

Open `lib/sequences.ts`. Replace the entire `SEQUENCES` array and add `STAGE_META` below it. The full updated file section (replace from line 5 through the end of the SEQUENCES array):

```ts
export const STAGE_META = {
  cold:    { label: "Cold",    color: "#60a5fa" },
  warm:    { label: "Warm",    color: "#f59e0b" },
  hot:     { label: "Hot",     color: "#E8185C" },
  podcast: { label: "Podcast", color: "#c084fc" },
  client:  { label: "Client",  color: "#facc15" },
} as const;

export type Stage = keyof typeof STAGE_META;

export const SEQUENCES = [
  { key: "lead_nurture",       label: "Lead Nurture",         stage: "warm"    as Stage, steps: 6,  color: "#60a5fa", delays: [0, 4, 48, 96, 336, 504] },
  { key: "audit_invite",       label: "Audit Invite",         stage: "cold"    as Stage, steps: 3,  color: "#E8185C", delays: [0, 72, 168] },
  { key: "audit_failed",       label: "Audit Failed",         stage: "cold"    as Stage, steps: 3,  color: "#f97316", delays: [0, 72, 168] },
  { key: "schedule_abandoned", label: "Schedule Abandoned",   stage: "cold"    as Stage, steps: 1,  color: "#fb923c", delays: [0.25] },
  { key: "video_watched",      label: "Video Watched (50%+)", stage: "cold"    as Stage, steps: 1,  color: "#fbbf24", delays: [0] },
  { key: "video_abandoned",    label: "Video Abandoned",      stage: "cold"    as Stage, steps: 1,  color: "#94a3b8", delays: [0] },
  { key: "post_booking",       label: "Post-Booking",         stage: "warm"    as Stage, steps: 2,  color: "#4ade80", delays: [0, 24] },
  { key: "no_show",            label: "No Show",              stage: "warm"    as Stage, steps: 4,  color: "#f87171", delays: [0, 48, 120, 168] },
  { key: "post_call",          label: "Post-Call",            stage: "hot"     as Stage, steps: 12, color: "#f472b6", delays: [24, 96, 192, 288, 384, 480, 600, 720, 840, 960, 1080, 1200] },
  { key: "warm_nurture",       label: "Warm Nurture",         stage: "warm"    as Stage, steps: 6,  color: "#34d399", delays: [0, 168, 336, 504, 672, 840] },
  { key: "long_term_nurture",  label: "Long-Term Nurture",    stage: "warm"    as Stage, steps: 6,  color: "#a78bfa", delays: [0, 1440, 2160, 2880, 3600, 4320] },
  { key: "claim_nurture",      label: "Claim Nurture",        stage: "warm"    as Stage, steps: 5,  color: "#f59e0b", delays: [0, 4, 24, 72, 168] },
  { key: "pre_interview",      label: "Pre-Interview",        stage: "podcast" as Stage, steps: 2,  color: "#c084fc", delays: [0, 24] },
  { key: "proof",              label: "Proof Series",         stage: "warm"    as Stage, steps: 7,  color: "#2dd4bf", delays: [24, 72, 168, 240, 336, 504, 672] },
  { key: "purchased_welcome",  label: "Purchased Welcome",    stage: "client"  as Stage, steps: 1,  color: "#facc15", delays: [0] },
  { key: "proof_nurture",      label: "Proof Nurture",        stage: "hot"     as Stage, steps: 5,  color: "#f97316", delays: [24, 48, 72, 96, 120] },
  { key: "post_interview",     label: "Post-Interview",       stage: "podcast" as Stage, steps: 1,  color: "#818cf8", delays: [0] },
] as const;
```

- [ ] **Step 2: Verify the build still passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors, build completes successfully.

- [ ] **Step 3: Commit**

```bash
git add lib/sequences.ts
git commit -m "Add stage field and STAGE_META to sequences"
```

---

### Task 2: Add stage filter pills to `TemplatesTab` in `LeadsHub.tsx`

**Files:**
- Modify: `app/admin/leads/LeadsHub.tsx`

- [ ] **Step 1: Update the import from `lib/sequences.ts`**

Find the existing import at the top of `LeadsHub.tsx`:
```ts
import { SEQUENCES, SEQ_LABEL } from "../../../lib/sequences";
```

Replace with:
```ts
import { SEQUENCES, SEQ_LABEL, STAGE_META, type Stage } from "../../../lib/sequences";
```

- [ ] **Step 2: Replace the `TemplatesTab` function entirely**

Find the entire `function TemplatesTab()` block (lines 458–509) and replace it with:

```tsx
function TemplatesTab() {
  const [activeStage, setActiveStage] = useState<"all" | Stage>("all");
  const [activeSeq, setActiveSeq] = useState("lead_nurture");
  const [activeStep, setActiveStep] = useState(1);

  const visibleSequences = activeStage === "all"
    ? SEQUENCES
    : SEQUENCES.filter(s => s.stage === activeStage);

  // If active sequence is not visible after a stage change, pick the first visible one
  const seq = visibleSequences.find(s => s.key === activeSeq) ?? visibleSequences[0];
  const safeSeq = seq ?? SEQUENCES[0];

  const templateFn = EMAIL_TEMPLATES[`${safeSeq.key}_${activeStep}` as keyof typeof EMAIL_TEMPLATES];
  const email = templateFn?.({ firstName: "Sarah", email: "sarah@example.com", overall: 28, seo: 22, ai: 24, auditId: "demo123" });

  function handleStageChange(stage: "all" | Stage) {
    setActiveStage(stage);
    const next = stage === "all" ? SEQUENCES : SEQUENCES.filter(s => s.stage === stage);
    if (!next.find(s => s.key === activeSeq)) {
      setActiveSeq(next[0]?.key ?? "lead_nurture");
      setActiveStep(1);
    }
  }

  const stages: Array<{ key: "all" | Stage; label: string; color: string }> = [
    { key: "all",     label: "All",     color: C.muted },
    { key: "cold",    label: "Cold",    color: STAGE_META.cold.color },
    { key: "warm",    label: "Warm",    color: STAGE_META.warm.color },
    { key: "hot",     label: "Hot",     color: STAGE_META.hot.color },
    { key: "podcast", label: "Podcast", color: STAGE_META.podcast.color },
    { key: "client",  label: "Client",  color: STAGE_META.client.color },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", background: C.bg }}>
      {/* Stage filter pills */}
      <div style={{ display: "flex", gap: 6, padding: "10px 16px", background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: "wrap" as const }}>
        {stages.map(st => {
          const active = activeStage === st.key;
          return (
            <button
              key={st.key}
              onClick={() => handleStageChange(st.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                border: `1px solid ${active ? st.color : C.border}`,
                background: active ? st.color : "transparent",
                color: active ? "#fff" : C.muted,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
              }}
            >
              {st.label}
            </button>
          );
        })}
      </div>

      {/* Main 3-column layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sequence sidebar */}
        <div style={{ width: 200, borderRight: `1px solid ${C.border}`, overflowY: "auto" as const, flexShrink: 0, background: C.card }}>
          <div style={{ padding: "12px 16px 8px", color: C.faint, fontSize: 9.5, textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600 }}>Sequences</div>
          {visibleSequences.map(s => (
            <button key={s.key} onClick={() => { setActiveSeq(s.key); setActiveStep(1); }} style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "10px 16px", fontSize: 12, cursor: "pointer", border: "none", background: safeSeq.key === s.key ? C.bg : "transparent", color: safeSeq.key === s.key ? s.color : C.muted, borderLeft: safeSeq.key === s.key ? `3px solid ${s.color}` : "3px solid transparent" }}>
              {s.label}
              <span style={{ display: "block", fontSize: 10, color: C.faint, marginTop: 2 }}>{s.delays.length} email{s.delays.length !== 1 ? "s" : ""}</span>
            </button>
          ))}
        </div>

        {/* Step sidebar */}
        <div style={{ width: 150, borderRight: `1px solid ${C.border}`, overflowY: "auto" as const, flexShrink: 0, background: C.card }}>
          <div style={{ padding: "12px 16px 8px", color: C.faint, fontSize: 9.5, textTransform: "uppercase" as const, letterSpacing: "0.08em", fontWeight: 600 }}>{safeSeq.label}</div>
          {safeSeq.delays.map((delay, i) => {
            const step = i + 1;
            const has = !!(EMAIL_TEMPLATES[`${safeSeq.key}_${step}` as keyof typeof EMAIL_TEMPLATES]);
            return (
              <button key={step} onClick={() => setActiveStep(step)} style={{ display: "block", width: "100%", textAlign: "left" as const, padding: "10px 16px", fontSize: 12, cursor: "pointer", border: "none", background: activeStep === step ? C.bg : "transparent", color: activeStep === step ? safeSeq.color : has ? C.muted : C.faint, borderLeft: activeStep === step ? `3px solid ${safeSeq.color}` : "3px solid transparent", opacity: has ? 1 : 0.45 }}>
                Email {step}
                <span style={{ display: "block", fontSize: 10, color: C.faint, marginTop: 2 }}>{formatDelay(delay)}</span>
              </button>
            );
          })}
        </div>

        {/* Email preview */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {email ? (
            <>
              <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <span style={{ background: safeSeq.color + "18", color: safeSeq.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{safeSeq.label} — Email {activeStep}</span>
                  <span style={{ color: C.faint, fontSize: 11 }}>{formatDelay(safeSeq.delays[activeStep - 1])}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Subject: {email.subject}</div>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <iframe srcDoc={email.html} style={{ width: "100%", height: "100%", border: "none" }} title={`${safeSeq.label} Email ${activeStep}`} />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.faint, fontSize: 13 }}>No template for this step.</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the build passes**

```bash
npm run build 2>&1 | tail -10
```

Expected: no TypeScript errors, build completes successfully.

- [ ] **Step 4: Manual smoke test**

Open `geo.heypearl.io/admin/leads` → Templates tab. Verify:
- 6 pills visible: All, Cold, Warm, Hot, Podcast, Client
- Clicking "Cold" shows only: Audit Invite, Audit Failed, Schedule Abandoned, Video Watched, Video Abandoned
- Clicking "Hot" shows only: Post-Call, Proof Nurture
- Clicking "All" restores all 17 sequences
- Switching stages while a sequence is selected auto-selects first in new stage
- Email preview still renders correctly for all stages

- [ ] **Step 5: Commit and deploy**

```bash
git add app/admin/leads/LeadsHub.tsx
git commit -m "Add Cold/Warm/Hot/Podcast/Client stage filter pills to Templates tab"
/opt/homebrew/bin/vercel --prod
```
