# Activity Page — Design Spec
**Approved:** 2026-03-29
**Reference mockup:** `.superpowers/brainstorm/67743-1774790477/content/activity-v11.html`

## Layout

Single page, no scroll. Everything fits above the fold. Five stacked sections:

1. Nav
2. Page header (inline title + subtitle)
3. Health strip
4. Stat strip
5. Sources strip
6. Two-column: Upcoming Appointments | Hot Leads

## Nav
- Background `#0F1E3A`, height 48px
- Brand: "GEO Admin" in `#E8185C`
- Links: Activity, Leads, Campaigns, Calls — muted until active

## Health Strip
- White card, thin border, green left accent when healthy
- Shows: ✅ Email Healthy · Queue pending · Bounces 24h · Complaints 24h · Details →
- Data from: `email_health` in activity API

## Stat Strip
Single white panel, 5 stats separated by vertical dividers. All clickable.

| Stat | Time window | Color |
|---|---|---|
| New Leads | Last 7 days | `#E8185C` |
| Emails Sent | Today | default |
| Hot Leads | 2+ clicks · last 7 days | `#ea580c` |
| Open Rate | Unique opens · last 30 days | `#16a34a` |
| Needs Action | Call outcomes · current | green if clear, amber if pending |

Time window shown as sub-label under each number — never hidden.

## Sources Strip
Same white panel style as stat strip. One column per funnel source + Import.

**Current sources:** Audit · Import
**Future:** each new funnel adds a column with the funnel name. Never merge funnels.

Each column shows: source name + "· last 30 days" | Leads | Booked | Conv%

**Source logic:**
- `audit` = /score + /claim entries (both are the Audit funnel)
- `import` = admin bulk-enroll tool only
- Future funnels tagged at enrollment time by funnel name

Conv% = booked ÷ leads. "Booked" = email appeared in `post_booking` sequence.

## Two-Column Section (fills remaining height)

### Left — Upcoming Appointments
- Shows calls scheduled in the future from `geo_scheduled_calls`
- Each row: name, email, time pill (blue)
- "No other upcoming appointments" empty state
- Clickable rows → lead profile

### Right — Hot Leads
- Label: "🔥 Hot Leads · 2+ clicks in last 7 days · not booked"
- "View all 47 →" link top right
- Table: Email | Clicks (colored by heat)
- Sorted by click count descending
- "+ N more · click to view all" footer row
- **Bug to fix at implementation:** current API `limit(500)` + `.slice(0,10)` before filter cuts off most leads. Must rewrite query to filter first, then limit.

## Bugs to Fix During Implementation
1. **Hot leads query** — fetches 500 click events, slices top 10, THEN filters suppressed/booked. Most of the 47 real hot leads never surface. Fix: group by email first, filter, then sort and limit.
2. **Monospace font** — activity page currently uses `fontFamily: "monospace"`. Change to system font stack.
3. **Timothy duplicate** — `geo_scheduled_calls` has two rows for same meeting. Fix: add dedup by email + meeting_time when querying upcoming calls.

## Colors
- Page background: `#F0F2F8`
- Cards/panels: `#fff`
- Borders: `#E2E8F2`
- Navy: `#0F1E3A`
- Pink accent: `#E8185C`
- Muted text: `#8A9AB5`, `#B0BDD0`
- Green: `#16a34a`
- Orange/hot: `#ea580c`, `#f97316`
