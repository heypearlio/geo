# Template Stage Filters — Design Spec
**Date:** 2026-03-30
**Status:** Approved

## Overview

Add stage filter pills to the Templates tab in the admin leads page so sequences can be browsed by funnel stage instead of scrolling through all 17 at once.

## Filter Stages

| Stage | Color | Sequences |
|-------|-------|-----------|
| **Cold** | Blue `#60a5fa` | audit_invite, audit_failed, schedule_abandoned, video_watched, video_abandoned |
| **Warm** | Amber `#f59e0b` | lead_nurture, claim_nurture, post_booking, no_show, warm_nurture, long_term_nurture, proof |
| **Hot** | Pink `#E8185C` | post_call, proof_nurture |
| **Podcast** | Purple `#c084fc` | pre_interview, post_interview |
| **Client** | Gold `#facc15` | purchased_welcome |

## UI Behavior

- Filter pills sit above the sequence sidebar in the Templates tab: `All | Cold | Warm | Hot | Podcast | Client`
- **All** is selected by default — no change to current behavior
- Clicking a stage filters the sidebar to only show sequences in that stage
- Active pill: filled background in stage color, white text
- Inactive pill: transparent background, muted text, subtle border
- If the currently selected sequence is not in the newly filtered set, auto-select the first sequence in the filtered list
- If no sequences match (impossible with current data but defensive): show "No templates in this stage"

## Data Model

Stage assignments live in `lib/sequences.ts` as a `stage` field added to each sequence object:

```ts
{ key: "audit_invite", label: "Audit Invite", stage: "cold", steps: 3, ... }
```

A `STAGE_LABELS` constant maps stage keys to display names and colors:

```ts
export const STAGE_META = {
  cold:    { label: "Cold",    color: "#60a5fa" },
  warm:    { label: "Warm",    color: "#f59e0b" },
  hot:     { label: "Hot",     color: "#E8185C" },
  podcast: { label: "Podcast", color: "#c084fc" },
  client:  { label: "Client",  color: "#facc15" },
} as const;
```

## Component Changes

**`lib/sequences.ts`** — add `stage` field to every sequence entry + export `STAGE_META`.

**`app/admin/leads/LeadsHub.tsx` — `TemplatesTab`:**
- Import `STAGE_META` from sequences
- Add `activeStage` state: `"all" | "cold" | "warm" | "hot" | "podcast" | "client"`, default `"all"`
- Derive `visibleSequences` by filtering `SEQUENCES` on `stage === activeStage` (or all if `"all"`)
- When `activeStage` changes: if `activeSeq` is not in `visibleSequences`, set `activeSeq` to `visibleSequences[0].key`
- Render filter pills above the sidebar using `STAGE_META` entries

## Out of Scope

- No changes to email sending, queue, or any non-template UI
- No persistence of selected stage across page reloads
