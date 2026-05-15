// Business-hours scheduler for email send times
// Slots: 8am, 10am, 12pm, 2pm, 4pm — Chicago time (CT), Mon-Sat only
// Immediate emails (delay = 0) are exempt — they always send right away.

const SLOTS = [8, 10, 12, 14, 16]; // CT hours
const CT_OFFSET = -6;               // UTC-6 (CST approx — close enough for email scheduling)

function toChicago(utc: Date): Date {
  return new Date(utc.getTime() + CT_OFFSET * 3600000);
}

function fromChicago(ct: Date): Date {
  return new Date(ct.getTime() - CT_OFFSET * 3600000);
}

/**
 * Snap a scheduled send time to the next allowed business-hour slot in CT.
 * Pass isImmediate=true for step-1 emails with delay=0 — they skip snapping.
 */
export function snapToBusinessHours(rawDate: Date, isImmediate: boolean): Date {
  if (isImmediate) return rawDate;

  let ct = toChicago(rawDate);

  for (let attempt = 0; attempt < 10; attempt++) {
    const day  = ct.getUTCDay();    // 0 = Sunday
    const hour = ct.getUTCHours();  // 0-23

    // Sunday: jump to Monday 8am CT
    if (day === 0) {
      ct = new Date(ct);
      ct.setUTCDate(ct.getUTCDate() + 1);
      ct.setUTCHours(8, 0, 0, 0);
      continue;
    }

    // Find the next slot strictly after the current hour
    const slot = SLOTS.find(s => s > hour);
    if (slot !== undefined) {
      const snapped = new Date(ct);
      snapped.setUTCHours(slot, 0, 0, 0);
      return fromChicago(snapped);
    }

    // Past 4pm — roll to next day at 8am
    ct = new Date(ct);
    ct.setUTCDate(ct.getUTCDate() + 1);
    ct.setUTCHours(8, 0, 0, 0);
    // Loop again to skip Sunday if needed
  }

  return rawDate; // fallback (should never reach here)
}
